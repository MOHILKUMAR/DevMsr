import { z } from 'zod';

/**
 * Lead form validation, shared by the browser (instant feedback) and the
 * server (authoritative). The server never trusts that client validation
 * ran: every submission is parsed with `leadSubmissionSchema` again.
 */

export const LEAD_FORM_TYPES = ['contact', 'quote', 'demo'] as const;
export type LeadFormType = (typeof LEAD_FORM_TYPES)[number];

export const BUDGET_RANGES = [
  { value: 'under_10k', label: 'Under ₹10,000' },
  { value: '10k_25k', label: '₹10,000–₹25,000' },
  { value: '25k_50k', label: '₹25,000–₹50,000' },
  { value: '50k_1l', label: '₹50,000–₹1,00,000' },
  { value: 'above_1l', label: 'Above ₹1,00,000' },
  { value: 'not_sure', label: 'Not sure yet' },
] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number]['value'];

export const TIMELINES = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'within_1_month', label: 'Within a month' },
  { value: '1_3_months', label: 'In 1–3 months' },
  { value: '3_6_months', label: 'In 3–6 months' },
  { value: 'flexible', label: 'Flexible / exploring' },
] as const;
export type Timeline = (typeof TIMELINES)[number]['value'];

export const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number]['value'];

const enumValues = <T extends readonly { value: string }[]>(items: T) =>
  items.map((item) => item.value) as unknown as [T[number]['value'], ...T[number]['value'][]];

/** Removes control characters (keeps newlines/tabs where allowed) and trims. */
export function cleanText(value: string, { multiline = false } = {}): string {
  // eslint-disable-next-line no-control-regex
  const pattern = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  const cleaned = value.replace(pattern, multiline ? '' : ' ').replace(/\r\n?/g, '\n');
  return multiline ? cleaned.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim() : cleaned.replace(/\s+/g, ' ').trim();
}

/** Normalises a phone number to digits with an optional leading "+". */
export function normalisePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

const optionalText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((value) => cleanText(value))
    .pipe(z.string().max(max, `Please keep this under ${max} characters.`))
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined));

/**
 * The "interested service" field: a category, a specific service, or not sure.
 * Encoded as "category:<slug>", "service:<slug>" or "not_sure".
 */
export const interestSchema = z
  .string()
  .trim()
  .min(1, 'Please choose the service you are interested in.')
  .regex(/^(not_sure|category:[a-z0-9-]{2,60}|service:[a-z0-9-]{2,80})$/, 'Please choose a service from the list.');

export const leadFieldsSchema = z
  .object({
    formType: z.enum(LEAD_FORM_TYPES),
    name: z
      .string()
      .max(240)
      .transform((value) => cleanText(value))
      .pipe(z.string().min(2, 'Please enter your name.').max(120, 'Please keep your name under 120 characters.')),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, 'That email address is too long.')
      .pipe(z.email('Please enter a valid email address.')),
    industry: z
      .string()
      .trim()
      .min(1, 'Please choose your industry.')
      .regex(/^(other|[a-z0-9-]{2,60})$/, 'Please choose an industry from the list.'),
    interest: interestSchema,
    projectDescription: z
      .string()
      .max(12000)
      .transform((value) => cleanText(value, { multiline: true }))
      .pipe(
        z
          .string()
          .min(20, 'Please describe your project in at least 20 characters.')
          .max(5000, 'Please keep the description under 5,000 characters.'),
      ),
    // Checkboxes arrive as "on" (HTML form), true (React) or are absent.
    privacyAcknowledged: z.preprocess(
      (value) => (value === true || value === 'on' || value === 'true' ? 'on' : ''),
      z.literal('on', { error: 'Please confirm you have read the privacy policy.' }),
    ),
    businessName: optionalText(160),
    phone: z
      .string()
      .max(40)
      .optional()
      .transform((value) => (value && value.trim() ? normalisePhone(value) : undefined))
      .refine((value) => value === undefined || /^\+?\d{7,15}$/.test(value), 'Please enter a valid phone number, e.g. +91 98765 43210.'),
    budgetRange: optionalEnum(enumValues(BUDGET_RANGES)),
    timeline: optionalEnum(enumValues(TIMELINES)),
    preferredContact: optionalEnum(enumValues(CONTACT_METHODS)),
    websiteUrl: z
      .string()
      .trim()
      .max(300, 'That URL is too long.')
      .optional()
      .transform((value) => {
        if (!value) return undefined;
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
      })
      .refine((value) => {
        if (value === undefined) return true;
        try {
          const url = new URL(value);
          return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
        } catch {
          return false;
        }
      }, 'Please enter a valid website address.'),
    consultationTime: optionalText(120),
  })
  .superRefine((value, ctx) => {
    if ((value.preferredContact === 'phone' || value.preferredContact === 'whatsapp') && !value.phone) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Please add a phone number so we can reach you that way.' });
    }
  });

/** Hidden anti-abuse and attribution fields that accompany every submission. */
export const leadMetaSchema = z.object({
  submissionId: z.uuid('Please reload the page and try again.'),
  formToken: z.string().max(200).optional().default(''),
  turnstileToken: z.string().max(4096).optional().default(''),
  /** Honeypot: hidden from people, often filled by bots. */
  companyWebsite: z.string().max(500).optional().default(''),
  sourcePath: z.string().max(200).optional().default(''),
  referrer: z.string().max(500).optional().default(''),
  utmSource: z.string().max(100).optional().default(''),
  utmMedium: z.string().max(100).optional().default(''),
  utmCampaign: z.string().max(150).optional().default(''),
});

export const leadSubmissionSchema = z.intersection(leadFieldsSchema, leadMetaSchema);

export type LeadFieldsInput = z.input<typeof leadFieldsSchema>;
export type LeadFields = z.output<typeof leadFieldsSchema>;
export type LeadSubmission = z.output<typeof leadSubmissionSchema>;

export function parseInterest(interest: string): { kind: 'category' | 'service' | 'not_sure'; slug: string | null } {
  if (interest === 'not_sure') return { kind: 'not_sure', slug: null };
  const [kind, slug] = interest.split(':', 2);
  if ((kind === 'category' || kind === 'service') && slug) return { kind, slug };
  return { kind: 'not_sure', slug: null };
}
