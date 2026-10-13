/**
 * Shared catalogue types.
 *
 * These mirror the Supabase schema (supabase/migrations) in camelCase.
 * Monetary amounts are carried as decimal strings ("25000.00") end to end
 * so no floating-point arithmetic ever touches a price.
 */

export const SERVICE_CATEGORY_SLUGS = [
  'web-development',
  'ecommerce',
  'custom-software',
  'management-systems',
  'pos-billing',
  'crm-erp',
  'ai-automation',
  'ai-agents-chatbots',
  'voice-ai',
  'integrations-payments',
  'hosting-maintenance',
] as const;
export type ServiceCategorySlug = (typeof SERVICE_CATEGORY_SLUGS)[number];

export const SERVICE_STATUSES = ['offered', 'on_request'] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const PRICING_MODELS = ['fixed', 'starting_from', 'range', 'quote_only', 'usage_based'] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const BILLING_INTERVALS = ['one_time', 'monthly', 'yearly', 'per_use'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const PRICING_GROUPS = [
  'websites',
  'healthcare',
  'hospitality',
  'restaurants',
  'retail',
  'travel-education',
  'ai-integrations-support',
] as const;
export type PricingGroup = (typeof PRICING_GROUPS)[number];

export const PRODUCT_STATUSES = ['available', 'demo', 'in_development', 'concept'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const BLOG_STATUSES = ['draft', 'published'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const FAQ_SCOPES = ['general', 'industry', 'service_category', 'pricing'] as const;
export type FaqScope = (typeof FAQ_SCOPES)[number];

export interface Industry {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ServiceCategorySlug;
  features: string[];
  status: ServiceStatus;
  sortOrder: number;
  industrySlugs: string[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ServicePrice {
  id: string;
  serviceSlug: string;
  label: string | null;
  displayGroup: PricingGroup;
  pricingModel: PricingModel;
  /** Decimal string, e.g. "3000.00". Null for quote-only. */
  minimumAmount: string | null;
  /** Decimal string. Null when there is no upper bound. */
  maximumAmount: string | null;
  /** Renders a trailing "+" — the upper figure is a typical ceiling, not a cap. */
  maxOpenEnded: boolean;
  currency: string;
  billingInterval: BillingInterval;
  priceNote: string | null;
  includedFeatures: string[];
  excludedFeatures: string[];
  /** What can move a quote towards (or above) the upper figure. */
  priceFactors: string[];
  estimatedDelivery: string | null;
  taxInclusive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: ProductStatus;
  industrySlug: string | null;
  serviceCategory: ServiceCategorySlug | null;
  features: string[];
  imageUrls: string[];
  technologyStack: string[];
  demoUrl: string | null;
  repositoryUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
}

export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  projectType: 'client' | 'internal' | 'prototype';
  technologyStack: string[];
  imageUrls: string[];
  demoUrl: string | null;
  repositoryUrl: string | null;
  industrySlugs: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown. Raw HTML is escaped at render time. */
  content: string;
  coverImage: string | null;
  status: BlogStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  /** Last edit, for structured data and the sitemap. */
  updatedAt: string | null;
}

export interface Faq {
  id: string;
  scope: FaqScope;
  /** Industry slug or service category slug, depending on scope. */
  scopeKey: string | null;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface SiteSettings {
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  businessHours: string | null;
  serviceArea: string;
  announcement: string | null;
  leadRetentionMonths: number;
}

/** Everything the public pages need, loaded in a single query. */
export interface Catalogue {
  industries: Industry[];
  services: Service[];
  pricing: ServicePrice[];
  products: Product[];
  faqs: Faq[];
  settings: SiteSettings;
  source: 'database' | 'bundled';
}
