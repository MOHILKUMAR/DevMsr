import type { ActionAPIContext } from 'astro:actions';
import { getServerConfig, type ServerConfig } from '../server/config';
import { createServiceClient } from '../supabase/clients';
import { verifyTurnstile } from '../security/turnstile';
import { ResendProvider } from '../email/provider';
import { loadCatalogue } from '../catalogue/repository';
import { getServiceCategoryContent } from '../../data/service-categories';
import { parseInterest } from '../../schemas/lead';
import { log } from '../server/logger';
import { createSupabaseLeadStore } from './supabase-store';
import { deliverLeadNotifications, type NotificationSettings } from './notifications';
import { submitLead } from './submit';
import type { LeadStore, SubmitOutcome } from './types';

/**
 * Builds real dependencies from server configuration. SERVER-ONLY.
 */

export function leadStoreFrom(config: ServerConfig): LeadStore | null {
  if (!config.supabase || !config.supabaseSecretKey) return null;
  return createSupabaseLeadStore(createServiceClient(config.supabase, config.supabaseSecretKey));
}

export function notificationSettingsFrom(config: ServerConfig): NotificationSettings {
  const { resendApiKey, from, ownerAddress, sendAcknowledgement } = config.email;
  return {
    provider: resendApiKey && from ? new ResendProvider(resendApiKey, from) : null,
    ownerAddress,
    sendAcknowledgement,
  };
}

function clientIpOf(context: ActionAPIContext): string | null {
  try {
    return context.clientAddress || null;
  } catch {
    return context.request.headers.get('cf-connecting-ip');
  }
}

export async function processLeadSubmission(formData: FormData, context: ActionAPIContext): Promise<SubmitOutcome> {
  const config = getServerConfig();
  const store = leadStoreFrom(config);
  const catalogue = await loadCatalogue(context.locals);
  const industries = new Map(catalogue.industries.map((industry) => [industry.slug, industry.name]));
  const services = new Map(catalogue.services.map((service) => [service.slug, service.name]));

  const raw = Object.fromEntries(Array.from(formData.entries()).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  const { turnstile } = config;

  const result = await submitLead(raw, {
    store,
    appSecret: config.appSecret,
    turnstile: turnstile ? (token, key) => verifyTurnstile(turnstile.secretKey, token, clientIpOf(context), key) : null,
    clientIp: clientIpOf(context),
    requestId: context.locals.requestId,
    adminBaseUrl: context.url.origin,
    describe: {
      industry: (slug) => (slug === 'other' ? 'Other / not listed' : (industries.get(slug) ?? slug)),
      interest: (value) => {
        const interest = parseInterest(value);
        if (interest.kind === 'service' && interest.slug) return services.get(interest.slug) ?? interest.slug;
        if (interest.kind === 'category' && interest.slug) return getServiceCategoryContent(interest.slug)?.name ?? interest.slug;
        return 'Not sure yet';
      },
    },
  });

  if (result.notify && store) {
    const job = deliverLeadNotifications(store, notificationSettingsFrom(config), result.notify, { requestId: context.locals.requestId });
    // Send after responding when the platform allows it; the lead is already saved.
    const waitUntil = context.locals.cfContext?.waitUntil?.bind(context.locals.cfContext);
    if (waitUntil) waitUntil(job);
    else await job;
  }

  if (result.outcome.status !== 'success') {
    log.info('lead.not_saved', { requestId: context.locals.requestId, status: result.outcome.status });
  }
  return result.outcome;
}
