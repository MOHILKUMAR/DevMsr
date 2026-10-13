import type { FaqScope, ProductStatus, ServiceCategorySlug } from '../../types/catalogue.ts';

/**
 * Seed content for products, portfolio, blog, FAQs and site settings.
 *
 * Honesty rules applied here:
 *  - Products are planned systems, so every one is seeded as "concept"
 *    except Lead Desk, which is the working admin of this website and is
 *    therefore "in_development" as a product for clients.
 *  - The only portfolio entry is this website itself (an internal project).
 *  - No testimonials, client names, metrics or results.
 */

export interface ProductSeed {
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: ProductStatus;
  industrySlug: string | null;
  serviceCategory: ServiceCategorySlug | null;
  features: string[];
  technologyStack: string[];
}

export const PRODUCT_SEED: ProductSeed[] = [
  {
    slug: 'lead-desk',
    name: 'Lead Desk',
    summary: 'A private inbox for website enquiries with statuses, notes, follow-up dates and activity history.',
    description:
      'Lead Desk is the lead-management dashboard that runs behind this website. Enquiries from contact, quote and demo forms are validated on the server, stored with a reference number and shown in a secure dashboard where they move through New, Contacted, Qualified, Proposal Sent, Won or Lost.\n\nWe use it ourselves. Packaging it as a product for other businesses — with their own branding and fields — is in development.',
    status: 'in_development',
    industrySlug: null,
    serviceCategory: 'crm-erp',
    features: ['Validated website forms with spam protection', 'Unique lead reference numbers', 'Status pipeline and follow-up dates', 'Internal notes and activity history', 'Email alerts with failure logging', 'Owner login with server-side access control'],
    technologyStack: ['Astro', 'TypeScript', 'Supabase (PostgreSQL)', 'Cloudflare Workers'],
  },
  {
    slug: 'opd-token-board',
    name: 'OPD Token Board',
    summary: 'Token issue at the desk, per-doctor queues and a live display for the waiting area.',
    description:
      'A planned OPD queue system for clinics: the front desk issues tokens, doctors call the next patient from a simple screen, and a TV in the waiting area shows the current token for each doctor.\n\nThis is a concept. We can build it for your clinic as a custom project today; it is not yet a packaged product.',
    status: 'concept',
    industrySlug: 'healthcare',
    serviceCategory: 'management-systems',
    features: ['Token issue and printing', 'Per-doctor queues', 'Call next, skip and recall', 'Waiting-area display', 'Day-end summary'],
    technologyStack: [],
  },
  {
    slug: 'hotel-front-desk',
    name: 'Hotel Front Desk',
    summary: 'Rooms, reservations, check-in, housekeeping status and GST invoices for small hotels.',
    description:
      'A planned front-office system for independent hotels and homestays: a reservations calendar, room status shared with housekeeping, check-in and check-out, and GST invoices that include restaurant charges.\n\nThis is a concept, available today as a custom build.',
    status: 'concept',
    industrySlug: 'hotels-hospitality',
    serviceCategory: 'management-systems',
    features: ['Reservations calendar', 'Room status board', 'Check-in and check-out', 'GST invoices', 'Occupancy report'],
    technologyStack: [],
  },
  {
    slug: 'restaurant-counter',
    name: 'Restaurant Counter',
    summary: 'Table billing, KOT and kitchen display with ingredient stock for small restaurants.',
    description:
      'A planned POS for restaurants and cafés: table and takeaway billing, kitchen tickets on a screen, GST invoices and basic ingredient stock.\n\nThis is a concept, available today as a custom build.',
    status: 'concept',
    industrySlug: 'restaurants',
    serviceCategory: 'pos-billing',
    features: ['Table and takeaway billing', 'Kitchen order display', 'GST invoices', 'Ingredient stock', 'Day-end report'],
    technologyStack: [],
  },
  {
    slug: 'size-grid-stock',
    name: 'Size Grid Stock',
    summary: 'Footwear and apparel stock by model, size and colour, with barcode billing.',
    description:
      'A planned inventory and billing system for footwear and apparel stores, where every model is tracked as a size-and-colour grid and billed by barcode.\n\nThis is a concept, available today as a custom build.',
    status: 'concept',
    industrySlug: 'retail-jewellery-footwear',
    serviceCategory: 'management-systems',
    features: ['Size and colour matrix', 'Barcode labels', 'POS billing', 'Size-wise re-order view', 'Multi-store stock (planned)'],
    technologyStack: [],
  },
  {
    slug: 'trip-desk',
    name: 'Trip Desk',
    summary: 'Travel enquiries, itineraries, quotes and payment schedules in one pipeline.',
    description:
      'A planned CRM for travel agencies: enquiries from the website and WhatsApp, day-wise itineraries built from reusable blocks, quotes, and payment tracking per booking.\n\nThis is a concept, available today as a custom build.',
    status: 'concept',
    industrySlug: 'travel-tourism',
    serviceCategory: 'crm-erp',
    features: ['Enquiry pipeline', 'Itinerary builder', 'Quotes and invoices', 'Payment schedule', 'Follow-up reminders'],
    technologyStack: [],
  },
  {
    slug: 'admissions-desk',
    name: 'Admissions Desk',
    summary: 'Admission enquiries, applications and fee collection tracked through the season.',
    description:
      'A planned admission CRM for schools and institutes: a landing page and form, an enquiry pipeline with follow-ups, application status and fee payment tracking.\n\nThis is a concept, available today as a custom build.',
    status: 'concept',
    industrySlug: 'education',
    serviceCategory: 'crm-erp',
    features: ['Admission landing page', 'Enquiry pipeline', 'Follow-up reminders', 'Application status', 'Fee tracking'],
    technologyStack: [],
  },
];

export interface PortfolioSeed {
  slug: string;
  title: string;
  summary: string;
  description: string;
  projectType: 'client' | 'internal' | 'prototype';
  technologyStack: string[];
  industrySlugs: string[];
  demoUrl: string | null;
}

export const PORTFOLIO_SEED: PortfolioSeed[] = [
  {
    slug: 'devmsr-website-and-lead-desk',
    title: 'DevMsr.in website and Lead Desk',
    summary: 'This website: a service and pricing catalogue, quote forms, and a private lead-management dashboard.',
    description: [
      '## What it is',
      'The site you are on. It is an internal project, not client work, and we list it because it is real and you can use it.',
      '',
      '## What it does',
      '- Publishes the service catalogue and indicative prices from a database, so prices are edited in one place.',
      '- Collects contact, quote and demo requests through server-validated forms with spam protection and rate limiting.',
      '- Gives the owner a secure dashboard to search, filter and update leads, add notes and set follow-up dates.',
      '- Records every status change in an activity history and logs email notification failures for retry.',
      '',
      '## How it is built',
      'Astro renders pages on Cloudflare Workers. Data lives in Supabase PostgreSQL with row-level security, and the admin is protected by server-side session checks.',
    ].join('\n'),
    projectType: 'internal',
    technologyStack: ['Astro', 'TypeScript', 'React', 'Tailwind CSS', 'Supabase', 'Cloudflare Workers'],
    industrySlugs: [],
    demoUrl: 'https://devmsr.in',
  },
];

export interface BlogSeed {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
}

export const BLOG_SEED: BlogSeed[] = [
  {
    slug: 'what-decides-the-cost-of-business-software',
    title: 'What decides the cost of business software',
    excerpt:
      'Why two “simple” systems can be quoted very differently, and what to prepare so your estimate is accurate.',
    status: 'published',
    publishedAt: '2026-10-12T00:00:00.000Z',
    content: [
      'Our pricing page shows ranges, not single numbers. This post explains what moves a project from the lower end of a range to the upper end, so you can read those ranges with some confidence.',
      '',
      '## 1. The number of roles',
      'A system used only by the owner is simpler than one used by a receptionist, a doctor, a pharmacist and an accountant. Each role needs its own screens, permissions and testing.',
      '',
      '## 2. Rules, not screens',
      'Screens are rarely the expensive part. Rules are: how GST is applied, when a token can be skipped, what happens when a booking is cancelled after an advance is paid. Writing those rules down before work starts is the most useful thing you can do for an accurate quote.',
      '',
      '## 3. Integrations',
      'Every payment gateway, messaging provider, printer or accounting tool adds setup, testing and failure handling. Integrations also bring **recurring charges** that are billed by the provider, not by us — transaction fees, message charges or AI usage.',
      '',
      '## 4. Existing data',
      'Starting fresh is cheaper than migrating years of records. If you need old data moved, we will ask for a sample early so the cleaning effort is visible in the quote.',
      '',
      '## 5. Testing and launch',
      'Software your staff depend on needs testing with real scenarios, training and a short period of close support after launch. We include an agreed amount of this in every quote rather than treating it as an extra.',
      '',
      '## What we include in a written quote',
      '- The features in scope, and the ones explicitly out of scope',
      '- Development cost, separate from hosting, maintenance and third-party charges',
      '- Whether GST applies',
      '- A delivery estimate and what it depends on',
      '',
      'If you have a rough idea of what you need, the [quote request form](/request-quote) asks the questions that matter most. A rough answer is fine.',
    ].join('\n'),
  },
];

export interface FaqSeed {
  scope: FaqScope;
  scopeKey: string | null;
  question: string;
  answer: string;
}

export const FAQ_SEED: FaqSeed[] = [
  // General
  {
    scope: 'general', scopeKey: null,
    question: 'Are the prices on this website final?',
    answer: 'No. They are indicative starting ranges. The final price depends on scope, integrations, data migration, testing and deployment requirements, and is confirmed in a written quote before any work starts.',
  },
  {
    scope: 'general', scopeKey: null,
    question: 'Do the prices include GST?',
    answer: 'No. Unless a price explicitly says it includes GST, GST is added where applicable.',
  },
  {
    scope: 'general', scopeKey: null,
    question: 'What happens after I submit a request?',
    answer: 'You receive a reference number on screen. We review your request, contact you by your preferred method if anything needs clarifying, and then send a written scope and quote.',
  },
  {
    scope: 'general', scopeKey: null,
    question: 'What costs are not included in development fees?',
    answer: 'Domain renewals, hosting plans, payment gateway fees, SMS or WhatsApp message charges, AI provider usage and any paid third-party software are billed by those providers. We list them separately in every quote.',
  },
  {
    scope: 'general', scopeKey: null,
    question: 'Do you work with clients outside India?',
    answer: 'Yes. Prices are shown in Indian rupees; for international projects we confirm the currency and payment method in the quote.',
  },
  {
    scope: 'general', scopeKey: null,
    question: 'Can I see a demo before we commit?',
    answer: 'Use the “Book a demo” form. Products marked Concept or In development are not finished products — we will show you what exists and be clear about what would be built for you.',
  },
  {
    scope: 'general', scopeKey: null,
    question: 'Can AI replace my front-desk or sales staff?',
    answer: 'AI assistants can handle routine questions and data entry, but their answers can be wrong. We design them with human review and hand-off for anything important, and AI-generated information may need verification.',
  },

  // Pricing page
  {
    scope: 'pricing', scopeKey: null,
    question: 'Why is there a range instead of a fixed price?',
    answer: 'Two projects with the same name can differ a lot in roles, rules and integrations. The range covers typical projects; your written quote will give one figure for an agreed scope.',
  },
  {
    scope: 'pricing', scopeKey: null,
    question: 'What does a “+” after a price mean?',
    answer: 'The upper figure is typical, not a cap. Larger projects in that category can cost more, and we say so before you commit.',
  },
  {
    scope: 'pricing', scopeKey: null,
    question: 'Are maintenance plans compulsory?',
    answer: 'No. Maintenance is optional and billed monthly if you choose it. Hosting and domain costs still apply because they are paid to those providers.',
  },

  // Industries
  {
    scope: 'industry', scopeKey: 'healthcare',
    question: 'Is the hospital software certified or compliant with health-record regulations?',
    answer: 'We do not claim certification. Medical-record features are built to the requirements you and your advisers define, and any compliance review is part of the scope discussion.',
  },
  {
    scope: 'industry', scopeKey: 'healthcare',
    question: 'Can patients book appointments on WhatsApp?',
    answer: 'Yes, through an approved WhatsApp Business provider. The provider charges per conversation; we include an estimate in the quote.',
  },
  {
    scope: 'industry', scopeKey: 'healthcare',
    question: 'Can we start with just OPD tokens and add billing later?',
    answer: 'Yes. Starting with one module and extending it is usually the better way to introduce software to busy staff.',
  },
  {
    scope: 'industry', scopeKey: 'hotels-hospitality',
    question: 'Can the booking website take advance payments?',
    answer: 'Yes, through a payment gateway in your business name. Payments are verified on the server before a booking is confirmed.',
  },
  {
    scope: 'industry', scopeKey: 'hotels-hospitality',
    question: 'Can you connect to a channel manager or OTAs?',
    answer: 'It depends on the provider’s API access and terms. We confirm feasibility for your provider before including it in a quote.',
  },
  {
    scope: 'industry', scopeKey: 'restaurants',
    question: 'Will the POS work with our existing printers?',
    answer: 'Most common thermal printers can be supported. Share the model numbers and we will confirm before quoting.',
  },
  {
    scope: 'industry', scopeKey: 'restaurants',
    question: 'Can we take online orders without aggregator commission?',
    answer: 'Yes, through your own ordering page. Payment gateway fees still apply, and delivery is handled by your staff or a delivery partner you choose.',
  },
  {
    scope: 'industry', scopeKey: 'retail-jewellery-footwear',
    question: 'Can stock be tracked by size and colour for each shoe model?',
    answer: 'Yes. Each model is stored as a size-and-colour grid with its own barcodes, so stock and sales are tracked per variant.',
  },
  {
    scope: 'industry', scopeKey: 'retail-jewellery-footwear',
    question: 'Does jewellery billing handle weight, purity and making charges?',
    answer: 'Yes, and the rules for rates, wastage and stones are configured to match how you bill today.',
  },
  {
    scope: 'industry', scopeKey: 'travel-tourism',
    question: 'Can clients view their itinerary on their phone?',
    answer: 'Yes. Itineraries can be shared as a web link and as a PDF.',
  },
  {
    scope: 'industry', scopeKey: 'travel-tourism',
    question: 'Can enquiries from our website go straight into the CRM?',
    answer: 'Yes. Website forms create CRM entries automatically, with the source recorded.',
  },
  {
    scope: 'industry', scopeKey: 'education',
    question: 'Can parents pay fees online?',
    answer: 'Yes, through a payment gateway. Receipts are generated after the payment is verified on the server.',
  },
  {
    scope: 'industry', scopeKey: 'education',
    question: 'Can we import existing student data?',
    answer: 'Yes, from Excel or CSV. We review a sample first so cleaning effort is reflected in the quote.',
  },
];

export const SITE_SETTINGS_SEED = {
  contact_email: null as string | null,
  contact_phone: null as string | null,
  whatsapp_number: null as string | null,
  business_hours: null as string | null,
  service_area: 'India, and international clients by arrangement',
  announcement: null as string | null,
  lead_retention_months: 24,
};
