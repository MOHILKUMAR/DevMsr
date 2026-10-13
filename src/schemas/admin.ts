import { z } from 'zod';
import {
  amountField,
  checkbox,
  httpsUrl,
  httpsUrlLines,
  integerField,
  lines,
  optionalText,
  optionalUuid,
  requiredText,
  slugField,
  uuidField,
} from '../lib/admin/form';
import { LEAD_STATUSES } from '../lib/leads/status';
import { ICON_NAMES } from '../lib/catalogue/icons';
import { BILLING_INTERVALS, PRICING_GROUPS, PRICING_MODELS, PRODUCT_STATUSES, SERVICE_CATEGORY_SLUGS, SERVICE_STATUSES } from '../types/catalogue';
import { compareAmounts, isValidAmount } from '../lib/utils/money';

/** Validation for every admin form. Unknown enum values are rejected. */

// ── Leads ─────────────────────────────────────────────────────────────
export const leadStatusSchema = z.object({ id: uuidField, status: z.enum(LEAD_STATUSES, 'Choose a valid status.') });

export const leadFollowUpSchema = z.object({
  id: uuidField,
  // <input type="date"> value, interpreted as 10:00 IST on that day; empty clears it.
  followUpDate: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Choose a valid date.'),
});

export const leadNoteSchema = z.object({ id: uuidField, note: requiredText(5000, 2) });

export const leadContactSchema = z.object({
  id: uuidField,
  name: requiredText(120, 2),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')),
  phone: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? '';
      if (!trimmed) return null;
      const digits = trimmed.replace(/\D/g, '');
      return trimmed.startsWith('+') ? `+${digits}` : digits;
    })
    .refine((value) => value === null || /^\+?\d{7,15}$/.test(value), 'Enter a valid phone number.'),
  businessName: optionalText(160),
});

export const leadIdSchema = z.object({ id: uuidField });
export const leadDeleteSchema = z.object({
  id: uuidField,
  // A deliberate confirmation, forgiving about case and stray spaces.
  confirm: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.literal('DELETE', { error: 'Type DELETE to confirm.' })),
});
export const notificationRetrySchema = z.object({
  id: uuidField,
  eventType: z.enum(['owner_new_lead', 'lead_acknowledgement']),
});

// ── Catalogue ─────────────────────────────────────────────────────────
export const industrySchema = z.object({
  id: optionalUuid,
  name: requiredText(120, 2),
  slug: slugField,
  description: z.string().trim().max(1000),
  icon: z.enum(ICON_NAMES, 'Choose an icon from the list.'),
  sortOrder: integerField(-10000, 10000),
  isActive: checkbox,
});

export const serviceSchema = z.object({
  id: optionalUuid,
  name: requiredText(160, 2),
  slug: slugField,
  shortDescription: requiredText(400),
  description: z.string().trim().max(10000),
  category: z.enum(SERVICE_CATEGORY_SLUGS, 'Choose a category.'),
  status: z.enum(SERVICE_STATUSES),
  features: lines(30, 200),
  industryIds: z.array(z.uuid()).max(20).optional().default([]),
  sortOrder: integerField(-10000, 100000),
  isActive: checkbox,
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
});

export const pricingSchema = z
  .object({
    id: optionalUuid,
    serviceId: uuidField,
    label: optionalText(160),
    displayGroup: z.enum(PRICING_GROUPS, 'Choose a display group.'),
    pricingModel: z.enum(PRICING_MODELS),
    minimumAmount: amountField,
    maximumAmount: amountField,
    maxOpenEnded: checkbox,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. INR.'),
    billingInterval: z.enum(BILLING_INTERVALS),
    priceNote: optionalText(500),
    includedFeatures: lines(30, 200),
    excludedFeatures: lines(30, 200),
    estimatedDelivery: optionalText(120),
    taxInclusive: checkbox,
    sortOrder: integerField(-10000, 100000),
    isActive: checkbox,
  })
  .superRefine((value, ctx) => {
    const needsMin = value.pricingModel === 'range' || value.pricingModel === 'fixed' || value.pricingModel === 'starting_from';
    if (needsMin && !value.minimumAmount) {
      ctx.addIssue({ code: 'custom', path: ['minimumAmount'], message: 'This pricing model needs a minimum amount.' });
    }
    // Zod runs object-level checks even if a field already failed, so re-check validity first.
    const { minimumAmount: min, maximumAmount: max } = value;
    if (min && max && isValidAmount(min) && isValidAmount(max) && compareAmounts(max, min) < 0) {
      ctx.addIssue({ code: 'custom', path: ['maximumAmount'], message: 'Maximum must be at least the minimum.' });
    }
  });

export const toggleSchema = z.object({ id: uuidField, isActive: checkbox });
export const deleteSchema = z.object({ id: uuidField });

// ── Content ───────────────────────────────────────────────────────────
export const productSchema = z.object({
  id: optionalUuid,
  name: requiredText(120, 2),
  slug: slugField,
  summary: requiredText(400),
  description: z.string().trim().max(20000),
  status: z.enum(PRODUCT_STATUSES, 'Choose a status.'),
  industryId: optionalUuid,
  serviceCategory: z
    .union([z.enum(SERVICE_CATEGORY_SLUGS), z.literal('')])
    .optional()
    .transform((value) => (value ? value : null)),
  features: lines(30, 200),
  technologyStack: lines(20, 60),
  imageUrls: httpsUrlLines(12),
  demoUrl: httpsUrl,
  repositoryUrl: httpsUrl,
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
  sortOrder: integerField(-10000, 100000),
  isPublished: checkbox,
  /** Required acknowledgement before marking a product "Available". */
  confirmAvailable: checkbox,
}).superRefine((value, ctx) => {
  if (value.status === 'available' && !value.confirmAvailable) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmAvailable'],
      message: 'Confirm the product is implemented and ready to offer before marking it Available.',
    });
  }
});

export const portfolioSchema = z.object({
  id: optionalUuid,
  title: requiredText(160, 2),
  slug: slugField,
  summary: requiredText(400),
  description: z.string().trim().max(20000),
  projectType: z.enum(['client', 'internal', 'prototype']),
  technologyStack: lines(20, 60),
  imageUrls: httpsUrlLines(12),
  demoUrl: httpsUrl,
  repositoryUrl: httpsUrl,
  industryIds: z.array(z.uuid()).max(10).optional().default([]),
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
  isPublished: checkbox,
  /** Client work can only be published with the client's permission. */
  clientPermission: checkbox,
}).superRefine((value, ctx) => {
  if (value.projectType === 'client' && value.isPublished && !value.clientPermission) {
    ctx.addIssue({ code: 'custom', path: ['clientPermission'], message: 'Confirm the client has agreed to be listed before publishing.' });
  }
});

export const blogSchema = z.object({
  id: optionalUuid,
  title: requiredText(200, 2),
  slug: slugField,
  excerpt: requiredText(400),
  content: z.string().max(100000),
  coverImage: httpsUrl,
  status: z.enum(['draft', 'published']),
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
});

export const faqSchema = z
  .object({
    id: optionalUuid,
    scope: z.enum(['general', 'industry', 'service_category', 'pricing']),
    industryId: optionalUuid,
    serviceCategory: z
      .union([z.enum(SERVICE_CATEGORY_SLUGS), z.literal('')])
      .optional()
      .transform((value) => (value ? value : null)),
    question: requiredText(300, 5),
    answer: requiredText(3000, 5),
    sortOrder: integerField(-10000, 100000),
    isActive: checkbox,
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'industry' && !value.industryId) ctx.addIssue({ code: 'custom', path: ['industryId'], message: 'Choose the industry.' });
    if (value.scope === 'service_category' && !value.serviceCategory)
      ctx.addIssue({ code: 'custom', path: ['serviceCategory'], message: 'Choose the service category.' });
  });

export const settingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null))
    .pipe(z.email('Enter a valid email.').nullable()),
  contactPhone: optionalText(40),
  whatsappNumber: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^\+?[\d\s-]{7,20}$/.test(value), 'Enter a number with country code, e.g. +91 98765 43210.'),
  businessHours: optionalText(120),
  serviceArea: requiredText(160),
  announcement: optionalText(200),
  leadRetentionMonths: integerField(1, 120),
});
