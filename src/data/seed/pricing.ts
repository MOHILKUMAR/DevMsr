import type { BillingInterval, PricingGroup, PricingModel } from '../../types/catalogue.ts';

/**
 * Initial indicative pricing (seed data), taken from the pricing brief.
 * Amounts are whole rupees written as decimal strings. After seeding,
 * prices are edited from /admin/pricing.
 */

export interface PricingSeed {
  serviceSlug: string;
  label: string;
  group: PricingGroup;
  model?: PricingModel;
  min: string | null;
  max: string | null;
  maxOpenEnded?: boolean;
  interval?: BillingInterval;
  note?: string;
  included?: string[];
  excluded?: string[];
}

export const PRICING_GROUP_LABELS: Record<PricingGroup, { label: string; description: string }> = {
  websites: { label: 'Websites', description: 'Landing pages, business sites, e-commerce and web applications.' },
  healthcare: { label: 'Healthcare', description: 'Clinic and hospital websites and systems.' },
  hospitality: { label: 'Hospitality', description: 'Hotel websites, booking and management.' },
  restaurants: { label: 'Restaurants', description: 'Menus, POS and restaurant management.' },
  retail: { label: 'Retail', description: 'POS, footwear and jewellery systems.' },
  'travel-education': { label: 'Travel & Education', description: 'Travel and school websites, CRM and management systems.' },
  'ai-integrations-support': { label: 'Automation, integrations & support', description: 'Automation, AI assistants, integrations, hosting and maintenance.' },
};

const WEBSITE_EXCLUSIONS = ['Domain registration and renewal', 'Hosting fees', 'Paid stock images or fonts', 'GST'];
const SYSTEM_EXCLUSIONS = ['Hosting and third-party fees', 'Hardware (printers, scanners, displays)', 'Data migration beyond the agreed scope', 'GST'];
const AI_EXCLUSIONS = ['AI provider usage charges', 'Messaging provider charges', 'GST'];

export const PRICING_SEED: PricingSeed[] = [
  // Websites
  {
    serviceSlug: 'landing-page', label: 'Landing page', group: 'websites', min: '3000', max: '8000',
    included: ['Single-page design and build', 'Enquiry form to your email', 'Mobile-responsive layout', 'Basic SEO and social preview'],
    excluded: WEBSITE_EXCLUSIONS,
  },
  {
    serviceSlug: 'portfolio-website', label: 'Portfolio website', group: 'websites', min: '5000', max: '15000',
    included: ['Up to 5 pages', 'Project or gallery section', 'Contact form', 'Basic SEO'],
    excluded: WEBSITE_EXCLUSIONS,
  },
  {
    serviceSlug: 'business-website', label: 'Business website', group: 'websites', min: '8000', max: '30000',
    note: 'Price depends mainly on page count, content readiness and integrations.',
    included: ['5–10 pages', 'Service pages', 'Enquiry form', 'Basic SEO setup', 'Deployment to your domain'],
    excluded: WEBSITE_EXCLUSIONS,
  },
  { serviceSlug: 'blog-website', label: 'Blog website', group: 'websites', min: '8000', max: '25000', excluded: WEBSITE_EXCLUSIONS },
  { serviceSlug: 'product-showcase-website', label: 'Product showcase', group: 'websites', min: '8000', max: '25000', excluded: WEBSITE_EXCLUSIONS },
  {
    serviceSlug: 'custom-product-website', label: 'Custom footwear/product website', group: 'websites', min: '15000', max: '50000',
    excluded: WEBSITE_EXCLUSIONS,
  },
  {
    serviceSlug: 'ecommerce-website', label: 'E-commerce website', group: 'websites', min: '25000', max: '100000', maxOpenEnded: true,
    note: 'Larger catalogues, custom integrations or marketplace features can exceed the upper figure.',
    included: ['Store design', 'Catalogue setup for an agreed number of products', 'Cart and checkout', 'Payment gateway integration', 'Order dashboard'],
    excluded: ['Payment gateway transaction fees', 'Shipping provider charges', 'Product photography', 'Hosting and domain', 'GST'],
  },
  {
    serviceSlug: 'custom-web-application', label: 'Custom web application', group: 'websites', min: '30000', max: '150000', maxOpenEnded: true,
    note: 'Quoted after a requirement workshop. Larger systems are delivered in phases.',
    excluded: ['Third-party licences and API fees', 'Hosting', 'GST'],
  },
  { serviceSlug: 'website-redesign', label: 'Website redesign', group: 'websites', min: '5000', max: '25000', excluded: WEBSITE_EXCLUSIONS },
  { serviceSlug: 'ui-ux-design', label: 'UI/UX design', group: 'websites', min: '5000', max: '30000', note: 'Design only; development is quoted separately.' },

  // Healthcare
  { serviceSlug: 'hospital-clinic-website', label: 'Hospital/clinic website', group: 'healthcare', min: '8000', max: '20000', excluded: WEBSITE_EXCLUSIONS },
  {
    serviceSlug: 'doctor-appointment-booking', label: 'Doctor appointment booking', group: 'healthcare', min: '20000', max: '45000',
    included: ['Slot rules per doctor', 'Online booking page', 'Email confirmations', 'Front-desk view'],
    excluded: ['SMS/WhatsApp message charges', 'Hosting', 'GST'],
  },
  {
    serviceSlug: 'hospital-management-system', label: 'Hospital Management MVP', group: 'healthcare', min: '40000', max: '90000',
    note: 'MVP scope: registration, OPD, billing and core reports. Further modules are quoted separately.',
    excluded: [...SYSTEM_EXCLUSIONS, 'Regulatory certification'],
  },
  { serviceSlug: 'opd-token-management', label: 'OPD token management', group: 'healthcare', min: '15000', max: '35000', excluded: SYSTEM_EXCLUSIONS },
  { serviceSlug: 'hospital-billing', label: 'Hospital billing system', group: 'healthcare', min: '15000', max: '35000', excluded: SYSTEM_EXCLUSIONS },

  // Hospitality
  { serviceSlug: 'hotel-website', label: 'Hotel website', group: 'hospitality', min: '8000', max: '20000', excluded: WEBSITE_EXCLUSIONS },
  {
    serviceSlug: 'hotel-booking-website', label: 'Hotel booking website', group: 'hospitality', min: '20000', max: '45000',
    excluded: ['Payment gateway transaction fees', 'Channel manager subscriptions', 'Hosting and domain', 'GST'],
  },
  {
    serviceSlug: 'hotel-management-system', label: 'Hotel Management MVP', group: 'hospitality', min: '40000', max: '90000',
    note: 'MVP scope: rooms, reservations, check-in/out, billing and reports.',
    excluded: SYSTEM_EXCLUSIONS,
  },
  { serviceSlug: 'hotel-billing-gst-invoices', label: 'Hotel billing system', group: 'hospitality', min: '15000', max: '35000', excluded: SYSTEM_EXCLUSIONS },

  // Restaurants
  { serviceSlug: 'restaurant-website-digital-menu', label: 'Restaurant website/digital menu', group: 'restaurants', min: '5000', max: '15000', excluded: WEBSITE_EXCLUSIONS },
  { serviceSlug: 'restaurant-pos-billing', label: 'Restaurant POS', group: 'restaurants', min: '15000', max: '35000', excluded: SYSTEM_EXCLUSIONS },
  {
    serviceSlug: 'restaurant-management-system', label: 'Restaurant Management MVP', group: 'restaurants', min: '30000', max: '70000',
    note: 'MVP scope: POS, kitchen display, menu and basic stock.',
    excluded: SYSTEM_EXCLUSIONS,
  },

  // Retail
  { serviceSlug: 'retail-pos-billing', label: 'Retail POS', group: 'retail', min: '15000', max: '35000', excluded: SYSTEM_EXCLUSIONS },
  { serviceSlug: 'footwear-inventory', label: 'Footwear inventory/POS', group: 'retail', min: '25000', max: '50000', excluded: SYSTEM_EXCLUSIONS },
  { serviceSlug: 'jewellery-inventory', label: 'Jewellery inventory/billing', group: 'retail', min: '30000', max: '75000', excluded: SYSTEM_EXCLUSIONS },

  // Travel and education
  { serviceSlug: 'travel-agency-website', label: 'Travel website', group: 'travel-education', min: '8000', max: '20000', excluded: WEBSITE_EXCLUSIONS },
  { serviceSlug: 'travel-booking-system', label: 'Travel booking system', group: 'travel-education', min: '30000', max: '70000', excluded: SYSTEM_EXCLUSIONS },
  { serviceSlug: 'travel-enquiry-crm', label: 'Travel CRM', group: 'travel-education', min: '20000', max: '45000', excluded: ['Messaging provider charges', 'Hosting', 'GST'] },
  { serviceSlug: 'school-website', label: 'School website', group: 'travel-education', min: '8000', max: '20000', excluded: WEBSITE_EXCLUSIONS },
  { serviceSlug: 'admission-crm', label: 'School admission system', group: 'travel-education', min: '15000', max: '35000', excluded: ['Messaging provider charges', 'Hosting', 'GST'] },
  {
    serviceSlug: 'school-management-system', label: 'School Management MVP', group: 'travel-education', min: '40000', max: '90000',
    note: 'MVP scope: students, attendance, fees and receipts.',
    excluded: SYSTEM_EXCLUSIONS,
  },

  // AI, integrations and support
  { serviceSlug: 'workflow-automation', label: 'Basic workflow automation', group: 'ai-integrations-support', min: '3000', max: '10000', excluded: ['Automation platform plans', 'GST'] },
  { serviceSlug: 'crm-updates-lead-routing', label: 'Lead automation', group: 'ai-integrations-support', min: '5000', max: '20000', excluded: ['Automation platform plans', 'Messaging provider charges', 'GST'] },
  { serviceSlug: 'n8n-workflow-development', label: 'n8n workflow', group: 'ai-integrations-support', min: '5000', max: '25000', excluded: ['n8n cloud plan or server hosting', 'GST'] },
  { serviceSlug: 'website-faq-chatbot', label: 'Website FAQ chatbot', group: 'ai-integrations-support', min: '10000', max: '30000', excluded: AI_EXCLUSIONS },
  { serviceSlug: 'lead-qualification-assistant', label: 'AI lead qualification', group: 'ai-integrations-support', min: '15000', max: '40000', excluded: AI_EXCLUSIONS },
  { serviceSlug: 'whatsapp-business-bot', label: 'WhatsApp bot', group: 'ai-integrations-support', min: '10000', max: '35000', excluded: ['WhatsApp Business provider and conversation charges', 'AI provider usage charges', 'GST'] },
  {
    serviceSlug: 'inbound-voice-agent', label: 'AI voice agent', group: 'ai-integrations-support', min: '25000', max: '100000', maxOpenEnded: true,
    note: 'Telephony and voice AI usage are billed by the providers and estimated before launch.',
    excluded: ['Telephony number rental and per-minute charges', 'Voice AI usage charges', 'GST'],
  },
  { serviceSlug: 'payment-gateway-integration', label: 'Payment integration', group: 'ai-integrations-support', min: '5000', max: '15000', excluded: ['Gateway account and per-transaction fees', 'GST'] },
  { serviceSlug: 'api-webhook-development', label: 'API integration', group: 'ai-integrations-support', min: '5000', max: '30000', maxOpenEnded: true, excluded: ['Third-party API fees', 'GST'] },
  {
    serviceSlug: 'website-maintenance', label: 'Website maintenance', group: 'ai-integrations-support', min: '1500', max: '5000', interval: 'monthly',
    included: ['Updates and security patches', 'Backups', 'Uptime monitoring', 'Small content changes'],
    excluded: ['Hosting bills', 'New features', 'GST'],
  },
  {
    serviceSlug: 'application-maintenance', label: 'Application maintenance', group: 'ai-integrations-support', min: '5000', max: '15000', maxOpenEnded: true, interval: 'monthly',
    excluded: ['Hosting bills', 'New features beyond plan hours', 'GST'],
  },
  { serviceSlug: 'hosting-deployment', label: 'Hosting/deployment setup', group: 'ai-integrations-support', min: '2000', max: '10000', excluded: ['Hosting provider bills', 'Domain renewal', 'GST'] },
];
