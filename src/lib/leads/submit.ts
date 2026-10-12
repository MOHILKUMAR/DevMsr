import { z } from 'zod';
import { leadSubmissionSchema, parseInterest, BUDGET_RANGES, CONTACT_METHODS, TIMELINES, type LeadSubmission } from '../../schemas/lead';
import { hashIdentifier, verifyFormToken } from '../security/tokens';
import type { TurnstileResult } from '../security/turnstile';
import { log } from '../server/logger';
import type { LeadEmailData } from '../email/templates';
import type { LeadStore, NewLeadRecord, SubmitOutcome } from './types';

/**
 * Lead intake pipeline. Dependencies are injected so every branch can be
 * unit tested without a network or database.
 *
 * Order matters:
 *   1. Parse and normalise with Zod (server-side, authoritative).
 *   2. Cheap bot checks: honeypot, signed form-age token.
 *   3. Turnstile verification (when configured).
 *   4. Rate limits (per hashed IP and per hashed email).
 *   5. Save the lead (idempotent) — the only step that must succeed.
 *   6. Hand back a notification job; emails are sent after the lead exists.
 */

export interface SubmitDeps {
  store: LeadStore | null;
  appSecret: string | null;
  turnstile: ((token: string, idempotencyKey: string) => Promise<TurnstileResult>) | null;
  clientIp: string | null;
  requestId: string;
  now?: () => number;
  /** Display names used in notification emails. */
  describe: { industry: (slug: string) => string; interest: (interest: string) => string };
  adminBaseUrl: string;
}

export interface SubmitResult {
  outcome: SubmitOutcome;
  /** Present when a new lead was saved and notifications should be sent. */
  notify?: { leadId: string; data: LeadEmailData };
}

export const RATE_LIMITS = {
  perIpPerHour: 5,
  perIpPerDay: 20,
  perEmailPerDay: 4,
} as const;

const GENERIC_INVALID = 'Please check the highlighted fields and try again.';

/** Flattens Zod issues into { field: firstMessage }. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fields[key] ??= issue.message;
  }
  return fields;
}

function labelOf(list: readonly { value: string; label: string }[], value: string | undefined): string | undefined {
  return value ? list.find((item) => item.value === value)?.label : undefined;
}

export function toLeadRecord(submission: LeadSubmission): NewLeadRecord {
  const interest = parseInterest(submission.interest);
  const trimTo = (value: string, max: number) => (value ? value.slice(0, max) : null);
  return {
    submission_id: submission.submissionId,
    form_type: submission.formType,
    name: submission.name,
    email: submission.email,
    business_name: submission.businessName ?? null,
    phone: submission.phone ?? null,
    industry_slug: submission.industry === 'other' ? null : submission.industry,
    service_slug: interest.kind === 'service' ? interest.slug : null,
    service_category: interest.kind === 'category' ? interest.slug : null,
    project_description: submission.projectDescription,
    budget_range: submission.budgetRange ?? null,
    timeline: submission.timeline ?? null,
    preferred_contact: submission.preferredContact ?? null,
    website_url: submission.websiteUrl ?? null,
    consultation_time: submission.consultationTime ?? null,
    source: `website:${submission.formType}`,
    source_path: /^\/[a-z0-9/_-]*$/i.test(submission.sourcePath) ? trimTo(submission.sourcePath, 200) : null,
    referrer: trimTo(submission.referrer, 500),
    utm_source: trimTo(submission.utmSource, 100),
    utm_medium: trimTo(submission.utmMedium, 100),
    utm_campaign: trimTo(submission.utmCampaign, 150),
  };
}

export async function submitLead(raw: Record<string, unknown>, deps: SubmitDeps): Promise<SubmitResult> {
  const now = deps.now ?? Date.now;

  // 1. Validate.
  const parsed = leadSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { outcome: { status: 'invalid', fieldErrors: fieldErrorsFrom(parsed.error), message: GENERIC_INVALID } };
  }
  const submission = parsed.data;

  // 2a. Honeypot: answer like a success so bots learn nothing, but save nothing.
  if (submission.companyWebsite.trim() !== '') {
    log.warn('lead.spam_honeypot', { requestId: deps.requestId });
    return { outcome: { status: 'success', reference: 'DM-RECEIVED', duplicate: false } };
  }

  // 2b. Signed form token (page must have been rendered by us, a few seconds ago).
  if (deps.appSecret) {
    const token = await verifyFormToken(deps.appSecret, submission.formToken, now());
    if (!token.ok) {
      log.warn('lead.form_token_rejected', { requestId: deps.requestId, reason: token.reason });
      if (token.reason === 'too_fast') {
        return { outcome: { status: 'rejected', reason: 'too_fast', message: 'That was very quick. Please wait a moment and submit again.' } };
      }
      return {
        outcome: { status: 'rejected', reason: 'expired', message: 'This form has expired. Please reload the page and submit again — your answers will need re-entering.' },
      };
    }
  } else {
    log.warn('lead.form_token_unchecked', { requestId: deps.requestId, reason: 'APP_SECRET not configured' });
  }

  if (!deps.store) {
    log.error('lead.store_unavailable', { requestId: deps.requestId });
    return { outcome: { status: 'unavailable', message: 'Our form is temporarily unavailable. Please try again later.' } };
  }

  // 3. Turnstile.
  if (deps.turnstile) {
    const verification = await deps.turnstile(submission.turnstileToken, submission.submissionId);
    if (!verification.success) {
      log.warn('lead.turnstile_failed', { requestId: deps.requestId, codes: verification.errorCodes });
      return {
        outcome: { status: 'rejected', reason: 'verification', message: 'We could not verify that you are human. Please complete the check and try again.' },
      };
    }
  }

  try {
    // 4. Rate limits (keys are HMACs; raw IPs and emails are never stored).
    if (deps.appSecret) {
      const checks: [string, number, number][] = [];
      if (deps.clientIp) {
        const ipKey = await hashIdentifier(deps.appSecret, 'ip', deps.clientIp);
        checks.push([`lead:ip:h:${ipKey}`, RATE_LIMITS.perIpPerHour, 3600], [`lead:ip:d:${ipKey}`, RATE_LIMITS.perIpPerDay, 86400]);
      }
      const emailKey = await hashIdentifier(deps.appSecret, 'email', submission.email);
      checks.push([`lead:email:d:${emailKey}`, RATE_LIMITS.perEmailPerDay, 86400]);
      for (const [key, limit, window] of checks) {
        if (!(await deps.store.checkRateLimit(key, limit, window))) {
          log.warn('lead.rate_limited', { requestId: deps.requestId, window });
          return {
            outcome: { status: 'rejected', reason: 'rate_limited', message: 'We have received several requests from you recently. Please try again later.' },
          };
        }
      }
    }

    // 5. Save (idempotent on submissionId).
    const record = toLeadRecord(submission);
    const saved = await deps.store.createLead(record);
    log.info('lead.saved', { requestId: deps.requestId, leadId: saved.leadId, reference: saved.reference, duplicate: saved.duplicate });

    if (saved.duplicate) {
      return { outcome: { status: 'success', reference: saved.reference, duplicate: true } };
    }

    return {
      outcome: { status: 'success', reference: saved.reference, duplicate: false },
      notify: {
        leadId: saved.leadId,
        data: {
          reference: saved.reference,
          formType: submission.formType,
          name: submission.name,
          email: submission.email,
          businessName: submission.businessName,
          phone: submission.phone,
          industry: deps.describe.industry(submission.industry),
          interest: deps.describe.interest(submission.interest),
          budget: labelOf(BUDGET_RANGES, submission.budgetRange),
          timeline: labelOf(TIMELINES, submission.timeline),
          preferredContact: labelOf(CONTACT_METHODS, submission.preferredContact),
          websiteUrl: submission.websiteUrl,
          consultationTime: submission.consultationTime,
          projectDescription: submission.projectDescription,
          adminUrl: `${deps.adminBaseUrl}/admin/leads/${saved.leadId}`,
        },
      },
    };
  } catch (error) {
    log.error('lead.save_failed', { requestId: deps.requestId, error });
    return { outcome: { status: 'unavailable', message: 'We could not save your request just now. Please try again in a few minutes.' } };
  }
}
