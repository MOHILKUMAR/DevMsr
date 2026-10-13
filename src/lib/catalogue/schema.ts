import { z } from 'zod';
import {
  BILLING_INTERVALS,
  BLOG_STATUSES,
  FAQ_SCOPES,
  PRICING_GROUPS,
  PRICING_MODELS,
  PRODUCT_STATUSES,
  SERVICE_CATEGORY_SLUGS,
  SERVICE_STATUSES,
  type BlogPost,
  type Catalogue,
  type PortfolioProject,
} from '../../types/catalogue';

/**
 * Runtime validation of database responses.
 *
 * Database rows are external input: we validate their shape before rendering
 * and convert snake_case to the camelCase domain types. Amounts arrive as
 * text (the SQL function casts numeric → text) and stay strings.
 */

const amount = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/)
  .nullable();
const textArray = z.array(z.string()).nullable().transform((value) => value ?? []);
const nullableText = z.string().nullable().optional().transform((value) => value ?? null);

const industryRow = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  sort_order: z.number().int(),
});

const serviceRow = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  short_description: z.string(),
  description: z.string(),
  category: z.enum(SERVICE_CATEGORY_SLUGS),
  features: textArray,
  status: z.enum(SERVICE_STATUSES),
  sort_order: z.number().int(),
  industry_slugs: textArray,
  seo_title: nullableText,
  seo_description: nullableText,
});

const priceRow = z.object({
  id: z.string(),
  service_slug: z.string(),
  label: nullableText,
  display_group: z.enum(PRICING_GROUPS),
  pricing_model: z.enum(PRICING_MODELS),
  minimum_amount: amount,
  maximum_amount: amount,
  max_open_ended: z.boolean(),
  currency: z.string().length(3),
  billing_interval: z.enum(BILLING_INTERVALS),
  price_note: nullableText,
  included_features: textArray,
  excluded_features: textArray,
  // Optional: databases without migration 20261013000004 do not return it.
  price_factors: textArray.optional().transform((value) => value ?? []),
  estimated_delivery: nullableText,
  tax_inclusive: z.boolean(),
  sort_order: z.number().int(),
});

const productRow = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  status: z.enum(PRODUCT_STATUSES),
  industry_slug: nullableText,
  service_category: z.enum(SERVICE_CATEGORY_SLUGS).nullable(),
  features: textArray,
  image_urls: textArray,
  technology_stack: textArray,
  demo_url: nullableText,
  repository_url: nullableText,
  seo_title: nullableText,
  seo_description: nullableText,
  sort_order: z.number().int(),
});

const faqRow = z.object({
  id: z.string(),
  scope: z.enum(FAQ_SCOPES),
  scope_key: nullableText,
  question: z.string(),
  answer: z.string(),
  sort_order: z.number().int(),
});

const settingsRow = z
  .object({
    contact_email: nullableText,
    contact_phone: nullableText,
    whatsapp_number: nullableText,
    business_hours: nullableText,
    service_area: z.string().nullable().optional(),
    announcement: nullableText,
    lead_retention_months: z.number().int().nullable().optional(),
  })
  .partial();

export const catalogueResponseSchema = z
  .object({
    industries: z.array(industryRow),
    services: z.array(serviceRow),
    pricing: z.array(priceRow),
    products: z.array(productRow),
    faqs: z.array(faqRow),
    settings: settingsRow.nullable(),
  })
  .transform(
    (data): Catalogue => ({
      industries: data.industries.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        icon: row.icon,
        sortOrder: row.sort_order,
      })),
      services: data.services.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        shortDescription: row.short_description,
        description: row.description,
        category: row.category,
        features: row.features,
        status: row.status,
        sortOrder: row.sort_order,
        industrySlugs: row.industry_slugs,
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
      })),
      pricing: data.pricing.map((row) => ({
        id: row.id,
        serviceSlug: row.service_slug,
        label: row.label,
        displayGroup: row.display_group,
        pricingModel: row.pricing_model,
        minimumAmount: row.minimum_amount,
        maximumAmount: row.maximum_amount,
        maxOpenEnded: row.max_open_ended,
        currency: row.currency,
        billingInterval: row.billing_interval,
        priceNote: row.price_note,
        includedFeatures: row.included_features,
        excludedFeatures: row.excluded_features,
        priceFactors: row.price_factors,
        estimatedDelivery: row.estimated_delivery,
        taxInclusive: row.tax_inclusive,
        sortOrder: row.sort_order,
      })),
      products: data.products.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        description: row.description,
        status: row.status,
        industrySlug: row.industry_slug,
        serviceCategory: row.service_category,
        features: row.features,
        imageUrls: row.image_urls,
        technologyStack: row.technology_stack,
        demoUrl: row.demo_url,
        repositoryUrl: row.repository_url,
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
        sortOrder: row.sort_order,
      })),
      faqs: data.faqs.map((row) => ({
        id: row.id,
        scope: row.scope,
        scopeKey: row.scope_key,
        question: row.question,
        answer: row.answer,
        sortOrder: row.sort_order,
      })),
      settings: {
        contactEmail: data.settings?.contact_email ?? null,
        contactPhone: data.settings?.contact_phone ?? null,
        whatsappNumber: data.settings?.whatsapp_number ?? null,
        businessHours: data.settings?.business_hours ?? null,
        serviceArea: data.settings?.service_area ?? 'India',
        announcement: data.settings?.announcement ?? null,
        leadRetentionMonths: data.settings?.lead_retention_months ?? 24,
      },
      source: 'database',
    }),
  );

export const portfolioRowSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    project_type: z.enum(['client', 'internal', 'prototype']),
    technology_stack: textArray,
    image_urls: textArray,
    demo_url: nullableText,
    repository_url: nullableText,
    industry_slugs: textArray,
    seo_title: nullableText,
    seo_description: nullableText,
    published_at: nullableText,
  })
  .transform(
    (row): PortfolioProject => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      description: row.description,
      projectType: row.project_type,
      technologyStack: row.technology_stack,
      imageUrls: row.image_urls,
      demoUrl: row.demo_url,
      repositoryUrl: row.repository_url,
      industrySlugs: row.industry_slugs,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      publishedAt: row.published_at,
    }),
  );

export const blogRowSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    excerpt: z.string(),
    content: z.string(),
    cover_image: nullableText,
    status: z.enum(BLOG_STATUSES),
    seo_title: nullableText,
    seo_description: nullableText,
    published_at: nullableText,
    updated_at: nullableText,
  })
  .transform(
    (row): BlogPost => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      coverImage: row.cover_image,
      status: row.status,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    }),
  );
