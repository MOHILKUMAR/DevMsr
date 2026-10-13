import type { BlogPost, Catalogue, PortfolioProject, ServicePrice } from '../types/catalogue.ts';
import { normaliseAmount } from '../lib/utils/money.ts';
import { INDUSTRY_CONTENT } from './industries.ts';
import { SERVICE_SEED } from './seed/services.ts';
import { PRICING_SEED } from './seed/pricing.ts';
import { BLOG_SEED, FAQ_SEED, PORTFOLIO_SEED, PRODUCT_SEED, SITE_SETTINGS_SEED } from './seed/content.ts';

/**
 * Builds the public catalogue from seed files.
 *
 * Used (1) when no database is configured, e.g. local development and CI,
 * and (2) as a fallback if the database cannot be reached. Once Supabase is
 * connected, the database is the source of truth and edits made in the admin
 * dashboard take precedence over these files.
 */
export function buildBundledCatalogue(): Catalogue {
  const industries = INDUSTRY_CONTENT.map((industry) => ({
    id: `seed-industry-${industry.slug}`,
    slug: industry.slug,
    name: industry.name,
    description: industry.description,
    icon: industry.icon,
    sortOrder: industry.sortOrder,
  }));

  const services = SERVICE_SEED.map((service, index) => ({
    id: `seed-service-${service.slug}`,
    slug: service.slug,
    name: service.name,
    shortDescription: service.shortDescription,
    description: '',
    category: service.category,
    features: service.features ?? [],
    status: service.status ?? 'offered',
    sortOrder: (index + 1) * 10,
    industrySlugs: service.industries,
    seoTitle: null,
    seoDescription: null,
  }));

  const pricing: ServicePrice[] = PRICING_SEED.map((row, index) => ({
    id: `seed-price-${index + 1}`,
    serviceSlug: row.serviceSlug,
    label: row.label,
    displayGroup: row.group,
    pricingModel: row.model ?? 'range',
    minimumAmount: row.min === null ? null : normaliseAmount(row.min),
    maximumAmount: row.max === null ? null : normaliseAmount(row.max),
    maxOpenEnded: row.maxOpenEnded ?? false,
    currency: 'INR',
    billingInterval: row.interval ?? 'one_time',
    priceNote: row.note ?? null,
    includedFeatures: row.included ?? [],
    excludedFeatures: row.excluded ?? [],
    priceFactors: row.factors ?? [],
    estimatedDelivery: null,
    taxInclusive: false,
    sortOrder: (index + 1) * 10,
  }));

  const products = PRODUCT_SEED.map((product, index) => ({
    id: `seed-product-${product.slug}`,
    slug: product.slug,
    name: product.name,
    summary: product.summary,
    description: product.description,
    status: product.status,
    industrySlug: product.industrySlug,
    serviceCategory: product.serviceCategory,
    features: product.features,
    imageUrls: [],
    technologyStack: product.technologyStack,
    demoUrl: null,
    repositoryUrl: null,
    seoTitle: null,
    seoDescription: null,
    sortOrder: (index + 1) * 10,
  }));

  const faqs = FAQ_SEED.map((faq, index) => ({
    id: `seed-faq-${index + 1}`,
    scope: faq.scope,
    scopeKey: faq.scopeKey,
    question: faq.question,
    answer: faq.answer,
    sortOrder: (index + 1) * 10,
  }));

  return {
    industries,
    services,
    pricing,
    products,
    faqs,
    settings: {
      contactEmail: SITE_SETTINGS_SEED.contact_email,
      contactPhone: SITE_SETTINGS_SEED.contact_phone,
      whatsappNumber: SITE_SETTINGS_SEED.whatsapp_number,
      businessHours: SITE_SETTINGS_SEED.business_hours,
      serviceArea: SITE_SETTINGS_SEED.service_area,
      announcement: SITE_SETTINGS_SEED.announcement,
      leadRetentionMonths: SITE_SETTINGS_SEED.lead_retention_months,
    },
    source: 'bundled',
  };
}

export function buildBundledPortfolio(): PortfolioProject[] {
  return PORTFOLIO_SEED.map((project) => ({
    id: `seed-portfolio-${project.slug}`,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.description,
    projectType: project.projectType,
    technologyStack: project.technologyStack,
    imageUrls: [],
    demoUrl: project.demoUrl,
    repositoryUrl: null,
    industrySlugs: project.industrySlugs,
    seoTitle: null,
    seoDescription: null,
    publishedAt: '2026-10-12T00:00:00.000Z',
  }));
}

export function buildBundledBlogPosts(): BlogPost[] {
  return BLOG_SEED.filter((post) => post.status === 'published').map((post) => ({
    id: `seed-post-${post.slug}`,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: null,
    status: post.status,
    seoTitle: null,
    seoDescription: null,
    publishedAt: post.publishedAt,
  }));
}
