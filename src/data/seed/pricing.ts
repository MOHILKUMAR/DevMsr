import type { BillingInterval, PricingGroup, PricingModel } from '../../types/catalogue.ts';

/**
 * Initial indicative pricing (seed data), taken from the pricing brief.
 * Scope ("included") and price factors follow the owner's Service Pricing
 * Master and Business Services & Pricing Guide (v1.2, 13 Oct 2026).
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
  /** What can move a quote towards (or above) the upper figure. */
  factors?: string[];
}

export const PRICING_GROUP_LABELS: Record<PricingGroup, { label: string; description: string }> = {
  websites: { label: 'Websites', description: 'Landing pages, business sites, e-commerce and web applications.' },
  healthcare: { label: 'Healthcare', description: 'Clinic and hospital websites, systems and social media.' },
  hospitality: { label: 'Hospitality', description: 'Hotel websites, booking and management.' },
  restaurants: { label: 'Restaurants', description: 'Menus, POS and restaurant management.' },
  retail: { label: 'Retail', description: 'POS, footwear and jewellery systems.' },
  'travel-education': { label: 'Travel & Education', description: 'Travel and school websites, CRM and management systems.' },
  'ai-integrations-support': { label: 'Automation, integrations & support', description: 'Automation, AI assistants, integrations, hosting and maintenance.' },
};

const WEBSITE_EXCLUSIONS = ['Domain registration and renewal', 'Hosting fees', 'Paid stock images or fonts', 'GST'];
const SYSTEM_EXCLUSIONS = ['Hosting and third-party fees', 'Hardware (printers, scanners, displays)', 'Data migration beyond the agreed scope', 'GST'];
const AI_EXCLUSIONS = ['AI provider usage charges', 'Messaging provider charges', 'GST'];
const SOCIAL_EXCLUSIONS = ['Domain and hosting, bought and owned by you', 'Ad spend, paid by you directly to the platforms', 'Influencer fees', 'Paid verification badges', 'Outstation travel for shoots, at cost', 'GST'];
const PARTNER_NOTE =
  'Minimum 6 months, then month to month with one month’s notice. Billed monthly in advance by the 5th, with the price locked for 12 months. The website is free; stopping before 6 months makes the website fee payable.';
const THREE_MONTH_NOTE = 'Paid once before work starts, and fully refundable until work starts. After 3 months, every login, file and admin access is handed back to you.';

export const PRICING_SEED: PricingSeed[] = [
  // Websites
  {
    serviceSlug: 'landing-page', label: 'Landing page', group: 'websites', min: '3000', max: '8000',
    included: ['Single-page design and build', 'Enquiry form to your email', 'Mobile-responsive layout', 'Basic SEO and social preview'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Page complexity', 'Custom design', 'Copywriting', 'Animations', 'Integrations', 'Form requirements'],
  },
  {
    serviceSlug: 'portfolio-website', label: 'Portfolio website', group: 'websites', min: '5000', max: '15000',
    included: ['Up to 5 pages', 'Project or gallery section', 'Contact form', 'Basic SEO'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Number of pages or projects', 'CMS', 'Case studies', 'Custom interactions'],
  },
  {
    serviceSlug: 'business-website', label: 'Business website', group: 'websites', min: '8000', max: '30000',
    note: 'Price depends mainly on page count, content readiness and integrations.',
    included: ['5–10 pages', 'Service pages', 'Enquiry form', 'Basic SEO setup', 'Deployment to your domain'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Page count', 'Content readiness', 'Custom layouts', 'Multilingual support', 'Integrations'],
  },
  {
    serviceSlug: 'blog-website', label: 'Blog website', group: 'websites', min: '8000', max: '25000',
    note: 'The exact CMS and editor scope is confirmed in your quote.',
    included: ['Blog structure', 'Article templates', 'Category and tag structure', 'Basic SEO'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['CMS choice', 'Author roles', 'Search', 'Migration', 'Article count', 'Editorial workflows'],
  },
  {
    serviceSlug: 'product-showcase-website', label: 'Product showcase', group: 'websites', min: '8000', max: '25000',
    note: 'Catalogue size is agreed in your quote.',
    included: ['Product listing pages', 'Product detail pages', 'Enquiry and contact path'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Product count', 'Variants', 'Filters', 'Search', 'CMS', 'Bulk imports'],
  },
  {
    serviceSlug: 'custom-product-website', label: 'Custom footwear/product website', group: 'websites', min: '15000', max: '50000',
    included: ['Custom product presentation', 'Product catalogue', 'Footwear or product-specific pages as agreed'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Size and colour variants', 'SKU logic', 'Inventory', 'Filters', 'Custom product configurator', 'E-commerce'],
  },
  {
    serviceSlug: 'ecommerce-website', label: 'E-commerce website', group: 'websites', min: '25000', max: '100000', maxOpenEnded: true,
    note: 'Larger catalogues, custom integrations or marketplace features can exceed the upper figure.',
    included: ['Store design', 'Catalogue setup for an agreed number of products', 'Cart and checkout', 'Payment gateway integration', 'Order dashboard'],
    excluded: ['Payment gateway transaction fees', 'Shipping provider charges', 'Product photography', 'Hosting and domain', 'GST'],
    factors: ['Product and variant count', 'Shipping', 'Taxes', 'Discounts', 'Customer accounts', 'Returns', 'Integrations', 'Marketplace requirements'],
  },
  {
    serviceSlug: 'custom-web-application', label: 'Custom web application', group: 'websites', min: '30000', max: '150000', maxOpenEnded: true,
    note: 'Quoted after a requirement workshop. Larger systems are delivered in phases.',
    included: ['Requirements workshop to define the scope'],
    excluded: ['Third-party licences and API fees', 'Hosting', 'GST'],
    factors: ['Roles', 'Workflows', 'Integrations', 'Reporting', 'Data model', 'Security', 'Performance', 'Migration'],
  },
  {
    serviceSlug: 'website-redesign', label: 'Website redesign', group: 'websites', min: '5000', max: '25000',
    note: 'Migration and content scope are defined in your quote.',
    included: ['Refresh of agreed existing pages and layouts'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Number of pages', 'Legacy framework', 'Content migration', 'Design changes', 'SEO preservation'],
  },
  {
    serviceSlug: 'ui-ux-design', label: 'UI/UX design', group: 'websites', min: '5000', max: '30000',
    note: 'Design only; development is quoted separately.',
    factors: ['Screens', 'Responsive states', 'Prototypes', 'Design system', 'Research and revision rounds'],
  },

  // Healthcare
  {
    serviceSlug: 'hospital-clinic-website', label: 'Hospital/clinic website', group: 'healthcare', min: '8000', max: '20000',
    note: 'Final pages are agreed in your quote.',
    included: ['Clinic or hospital pages', 'Services and departments', 'Contact and enquiry path'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Doctor profiles', 'Departments', 'Languages', 'Content', 'Appointment integrations'],
  },
  {
    serviceSlug: 'doctor-appointment-booking', label: 'Doctor appointment booking', group: 'healthcare', min: '20000', max: '45000',
    included: ['Slot rules per doctor', 'Online booking page', 'Email confirmations', 'Front-desk view'],
    excluded: ['SMS/WhatsApp message charges', 'Hosting', 'GST'],
    factors: ['Number of doctors or locations', 'Schedule rules', 'Rescheduling', 'Reminders', 'Payments', 'Integrations'],
  },
  {
    serviceSlug: 'hospital-management-system', label: 'Hospital Management MVP', group: 'healthcare', min: '40000', max: '90000',
    note: 'MVP scope: registration, OPD, billing and core reports. Further modules are quoted separately.',
    included: ['Registration', 'OPD', 'Billing', 'Core reports'],
    excluded: [...SYSTEM_EXCLUSIONS, 'Regulatory certification'],
    factors: ['Departments', 'Roles', 'Patient workflows', 'Reports', 'Migration', 'Security and audit requirements'],
  },
  {
    serviceSlug: 'opd-token-management', label: 'OPD token management', group: 'healthcare', min: '15000', max: '35000',
    included: ['Token and queue workflow', 'Status views as agreed in scope'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Doctors', 'Counters', 'Live updates', 'Display screens', 'WhatsApp/SMS', 'Multi-location support'],
  },
  {
    serviceSlug: 'hospital-billing', label: 'Hospital billing system', group: 'healthcare', min: '15000', max: '35000',
    included: ['Billing workflow', 'Agreed invoice and report features'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Invoice rules', 'Payment modes', 'Discounts', 'Taxes', 'Roles', 'Printer or hardware integration'],
  },

  // Hospitality
  {
    serviceSlug: 'hotel-website', label: 'Hotel website', group: 'hospitality', min: '8000', max: '20000',
    included: ['Hotel pages', 'Room and amenity presentation', 'Enquiry and contact path'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Room categories', 'Galleries', 'Content', 'Languages', 'Booking integrations'],
  },
  {
    serviceSlug: 'hotel-booking-website', label: 'Hotel booking website', group: 'hospitality', min: '20000', max: '45000',
    included: ['Booking interface', 'Availability and reservation workflow as agreed'],
    excluded: ['Payment gateway transaction fees', 'Channel manager subscriptions', 'Hosting and domain', 'GST'],
    factors: ['Room types', 'Seasonal rates', 'Payment flow', 'Cancellation rules', 'Channel manager integrations'],
  },
  {
    serviceSlug: 'hotel-management-system', label: 'Hotel Management MVP', group: 'hospitality', min: '40000', max: '90000',
    note: 'MVP scope: rooms, reservations, check-in/out, billing and reports.',
    included: ['Rooms', 'Reservations', 'Check-in and check-out', 'Billing', 'Reports'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Room count and workflows', 'Restaurant integration', 'Staff roles', 'Reporting', 'Migration'],
  },
  {
    serviceSlug: 'hotel-billing-gst-invoices', label: 'Hotel billing system', group: 'hospitality', min: '15000', max: '35000',
    included: ['Hotel billing', 'Agreed invoice and settlement workflow'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Room and restaurant charges', 'GST invoice needs', 'Split billing', 'Payment modes', 'Hardware'],
  },

  // Restaurants
  {
    serviceSlug: 'restaurant-website-digital-menu', label: 'Restaurant website/digital menu', group: 'restaurants', min: '5000', max: '15000',
    included: ['Restaurant website or mobile-friendly digital menu'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Menu size', 'Categories', 'QR menu', 'Ordering', 'Location pages', 'Content'],
  },
  {
    serviceSlug: 'restaurant-pos-billing', label: 'Restaurant POS', group: 'restaurants', min: '15000', max: '35000',
    included: ['Point-of-sale workflow', 'Agreed billing functions'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Tables', 'Modifiers', 'Kitchen printer or display', 'Inventory', 'Offline needs', 'Hardware'],
  },
  {
    serviceSlug: 'restaurant-management-system', label: 'Restaurant Management MVP', group: 'restaurants', min: '30000', max: '70000',
    note: 'MVP scope: POS, kitchen display, menu and basic stock.',
    included: ['POS', 'Kitchen display', 'Menu', 'Basic stock'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Multi-branch', 'Recipe costing', 'Delivery', 'Staff roles', 'Supplier management', 'Reports'],
  },

  // Retail
  {
    serviceSlug: 'retail-pos-billing', label: 'Retail POS', group: 'retail', min: '15000', max: '35000',
    included: ['Retail billing', 'Agreed sales and stock functions'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Barcode', 'Returns', 'Discounts', 'Inventory', 'Multiple counters or stores', 'Hardware'],
  },
  {
    serviceSlug: 'footwear-inventory', label: 'Footwear inventory/POS', group: 'retail', min: '25000', max: '50000',
    included: ['Inventory and POS built around size, colour and SKU variants'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Variant matrix', 'Barcode', 'Purchase orders', 'Stock transfers', 'Multiple stores'],
  },
  {
    serviceSlug: 'jewellery-inventory', label: 'Jewellery inventory/billing', group: 'retail', min: '30000', max: '75000',
    included: ['Jewellery inventory and billing', 'Item attributes agreed in scope'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Weight and purity', 'Making charges', 'Barcode', 'Traceability', 'Purchase and sales', 'Audit reports'],
  },

  // Travel and education
  {
    serviceSlug: 'travel-agency-website', label: 'Travel website', group: 'travel-education', min: '8000', max: '20000',
    included: ['Travel agency website', 'Tour and package presentation'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Packages', 'Itineraries', 'Enquiry forms', 'Destinations', 'Content', 'Languages'],
  },
  {
    serviceSlug: 'travel-booking-system', label: 'Travel booking system', group: 'travel-education', min: '30000', max: '70000',
    included: ['Booking workflow', 'Reservation management as agreed'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Availability', 'Payments', 'Cancellations', 'Supplier APIs', 'Notifications', 'Dashboards'],
  },
  {
    serviceSlug: 'travel-enquiry-crm', label: 'Travel CRM', group: 'travel-education', min: '20000', max: '45000',
    included: ['Enquiry and customer pipeline', 'Follow-up workflow'],
    excluded: ['Messaging provider charges', 'Hosting', 'GST'],
    factors: ['Stages', 'Users', 'Reminders', 'Quotation generation', 'Integrations', 'Reporting'],
  },
  {
    serviceSlug: 'school-website', label: 'School website', group: 'travel-education', min: '8000', max: '20000',
    included: ['School pages', 'Announcements', 'Enquiry and admission contact path'],
    excluded: WEBSITE_EXCLUSIONS,
    factors: ['Page count', 'Galleries', 'Calendars', 'Notices', 'Languages', 'Content'],
  },
  {
    serviceSlug: 'admission-crm', label: 'School admission system', group: 'travel-education', min: '15000', max: '35000',
    included: ['Admission enquiry and application workflow', 'Agreed status tracking'],
    excluded: ['Messaging provider charges', 'Hosting', 'GST'],
    factors: ['Form complexity', 'Document uploads', 'Review stages', 'Notifications', 'Reporting'],
  },
  {
    serviceSlug: 'school-management-system', label: 'School Management MVP', group: 'travel-education', min: '40000', max: '90000',
    note: 'MVP scope: students, attendance, fees and receipts.',
    included: ['Students', 'Attendance', 'Fees', 'Receipts'],
    excluded: SYSTEM_EXCLUSIONS,
    factors: ['Classes', 'Staff roles', 'Parent access', 'Examinations', 'Messaging', 'Migration'],
  },

  // AI, integrations and support
  {
    serviceSlug: 'workflow-automation', label: 'Basic workflow automation', group: 'ai-integrations-support', min: '3000', max: '10000',
    included: ['One simple automation', 'Agreed trigger and actions', 'Failure path'],
    excluded: ['Automation platform plans', 'GST'],
    factors: ['Number of steps', 'Apps', 'Branching', 'Retries', 'Testing', 'Monitoring'],
  },
  {
    serviceSlug: 'crm-updates-lead-routing', label: 'Lead automation', group: 'ai-integrations-support', min: '5000', max: '20000',
    included: ['Lead capture and routing', 'Agreed notifications or CRM updates'],
    excluded: ['Automation platform plans', 'Messaging provider charges', 'GST'],
    factors: ['Lead sources', 'Qualification rules', 'Integrations', 'Deduplication', 'Reporting'],
  },
  {
    serviceSlug: 'n8n-workflow-development', label: 'n8n workflow', group: 'ai-integrations-support', min: '5000', max: '25000',
    included: ['Workflow built and tested in n8n for an agreed process'],
    excluded: ['n8n cloud plan or server hosting', 'GST'],
    factors: ['Nodes', 'Branches', 'External APIs', 'Error handling', 'Self-hosting', 'Documentation'],
  },
  {
    serviceSlug: 'website-faq-chatbot', label: 'Website FAQ chatbot', group: 'ai-integrations-support', min: '10000', max: '30000',
    included: ['FAQ assistant for an agreed knowledge source', 'Agreed handoff path'],
    excluded: AI_EXCLUSIONS,
    factors: ['Knowledge size', 'Retrieval', 'Admin updates', 'Analytics', 'AI provider and model'],
  },
  {
    serviceSlug: 'lead-qualification-assistant', label: 'AI lead qualification', group: 'ai-integrations-support', min: '15000', max: '40000',
    included: ['AI-assisted lead classification or qualification', 'Agreed routing'],
    excluded: AI_EXCLUSIONS,
    factors: ['Scoring rules', 'CRM integration', 'Evaluation', 'Human review', 'Usage limits'],
  },
  {
    serviceSlug: 'whatsapp-business-bot', label: 'WhatsApp bot', group: 'ai-integrations-support', min: '10000', max: '35000',
    included: ['WhatsApp workflow or bot for agreed messages and conversation paths'],
    excluded: ['WhatsApp Business provider and conversation charges', 'AI provider usage charges', 'GST'],
    factors: ['Approved provider', 'Templates', 'Integrations', 'Opt-in', 'Conversation logic'],
  },
  {
    serviceSlug: 'inbound-voice-agent', label: 'AI voice agent', group: 'ai-integrations-support', min: '25000', max: '100000', maxOpenEnded: true,
    note: 'Telephony and voice AI usage are billed by the providers and estimated before launch.',
    included: ['Voice agent for a defined inbound or outbound use case'],
    excluded: ['Telephony number rental and per-minute charges', 'Voice AI usage charges', 'GST'],
    factors: ['Call flows', 'Language', 'Telephony', 'Integrations', 'Handoff', 'Testing and compliance'],
  },
  {
    serviceSlug: 'payment-gateway-integration', label: 'Payment integration', group: 'ai-integrations-support', min: '5000', max: '15000',
    included: ['Integration with one agreed payment gateway', 'Payment confirmation workflow'],
    excluded: ['Gateway account and per-transaction fees', 'GST'],
    factors: ['Checkout complexity', 'Refunds', 'Webhooks', 'Subscriptions', 'Reconciliation'],
  },
  {
    serviceSlug: 'api-webhook-development', label: 'API integration', group: 'ai-integrations-support', min: '5000', max: '30000', maxOpenEnded: true,
    included: ['Connection to one agreed external API'],
    excluded: ['Third-party API fees', 'GST'],
    factors: ['API quality', 'Authentication', 'Rate limits', 'Data mapping', 'Retries', 'Documentation'],
  },
  {
    serviceSlug: 'website-maintenance', label: 'Website maintenance', group: 'ai-integrations-support', min: '1500', max: '5000', interval: 'monthly',
    note: 'Exact coverage is defined by your plan.',
    included: ['Updates and security patches', 'Backups', 'Uptime monitoring', 'Small content changes'],
    excluded: ['Hosting bills', 'New features', 'GST'],
    factors: ['Response time', 'Update frequency', 'Backup retention', 'Included support hours'],
  },
  {
    serviceSlug: 'application-maintenance', label: 'Application maintenance', group: 'ai-integrations-support', min: '5000', max: '15000', maxOpenEnded: true, interval: 'monthly',
    included: ['Ongoing application maintenance', 'Agreed support scope'],
    excluded: ['Hosting bills', 'New features beyond plan hours', 'GST'],
    factors: ['Application complexity', 'Support hours', 'SLA', 'Monitoring', 'Dependency updates'],
  },
  {
    serviceSlug: 'hosting-deployment', label: 'Hosting/deployment setup', group: 'ai-integrations-support', min: '2000', max: '10000',
    included: ['Deployment setup for an agreed hosting environment', 'Handover'],
    excluded: ['Hosting provider bills', 'Domain renewal', 'GST'],
    factors: ['Environment count', 'DNS', 'CI/CD', 'Server setup', 'Monitoring', 'Rollback requirements'],
  },

  // Social media management: fixed plan prices from the owner's healthcare pitch deck (revised Nov 2026).
  // Labels are referenced by the plan table in src/data/social-media.ts.
  {
    serviceSlug: 'healthcare-social-media-management', label: 'Basic Partner Plan', group: 'healthcare', model: 'fixed', min: '6999', max: '6999', interval: 'monthly',
    note: PARTNER_NOTE,
    included: ['Free static website', 'Instagram, Facebook and Google', '8 posts, 2 reels and 8 stories a month', 'Festival and health-day posts', 'Review replies and a monthly report', 'One shoot at your hospital every 3 months'],
    excluded: SOCIAL_EXCLUSIONS,
  },
  {
    serviceSlug: 'healthcare-social-media-management', label: 'Professional Partner Plan', group: 'healthcare', model: 'fixed', min: '11999', max: '11999', interval: 'monthly',
    note: PARTNER_NOTE,
    included: ['Free website with an admin dashboard', 'All 5 platforms and Google', '12 posts, 4 reels, 5 carousels and 15 stories a month', 'A shoot at your hospital every month', 'Camp and awareness campaigns', 'Review replies, feedback QR and reputation report', '2 doctor-reviewed blogs a month', 'Monthly report and review call'],
    excluded: SOCIAL_EXCLUSIONS,
  },
  {
    serviceSlug: 'healthcare-social-media-management', label: 'Premium Partner Plan, with Local SEO', group: 'healthcare', model: 'fixed', min: '17999', max: '17999', interval: 'monthly',
    note: PARTNER_NOTE,
    included: ['Everything in Professional', 'Free professional website', 'Local SEO with backlinks from 25+ real sites', 'Profile upkeep on 10+ platforms', '4 blogs a month, shared on 25+ sites', 'Monthly ranking report'],
    excluded: SOCIAL_EXCLUSIONS,
  },
  {
    serviceSlug: 'social-media-3-month-plan', label: 'Basic 3-Month Plan', group: 'healthcare', model: 'fixed', min: '29999', max: '29999',
    note: `Same services as the Basic Partner Plan. ${THREE_MONTH_NOTE}`,
    included: ['Static website, live', 'Instagram, Facebook and Google set up', '8 posts and 2 reels a month', 'One shoot at your hospital', 'Review replies and reports'],
    excluded: SOCIAL_EXCLUSIONS,
  },
  {
    serviceSlug: 'social-media-3-month-plan', label: 'Professional 3-Month Plan', group: 'healthcare', model: 'fixed', min: '44999', max: '44999',
    note: `Same services as the Professional Partner Plan. ${THREE_MONTH_NOTE}`,
    included: ['Website with an admin dashboard, live', 'All 5 platforms and Google set up', '12 posts, 4 reels and 5 carousels a month', '3 shoots at your hospital', 'Camp campaigns and 2 blogs a month'],
    excluded: SOCIAL_EXCLUSIONS,
  },
  {
    serviceSlug: 'social-media-3-month-plan', label: 'Premium 3-Month Plan, with Local SEO', group: 'healthcare', model: 'fixed', min: '59999', max: '59999',
    note: `Same services as the Premium Partner Plan. ${THREE_MONTH_NOTE}`,
    included: ['Everything in Professional', 'Professional website, live', 'Local SEO setup with 25+ backlinks', 'Profiles on 10+ platforms', '4 blogs a month, shared on 25+ sites'],
    excluded: SOCIAL_EXCLUSIONS,
  },
  {
    serviceSlug: 'digital-presence-audit', label: 'Digital presence audit', group: 'healthcare', model: 'fixed', min: '999', max: '999',
    note: 'Adjusted against your first invoice if you join a plan within 7 days of receiving the audit.',
    included: ['Social media profiles: activity, branding and bio', 'Website: mobile view, speed, contact and booking path', 'Google reviews: rating, replies and recent feedback', 'Google Business Profile: address, timings, photos and category', 'NMC compliance of existing posts', 'A 90-day roadmap with exact costing'],
    excluded: ['GST'],
  },
  {
    serviceSlug: 'local-seo', label: 'Local SEO, in the Premium Partner Plan', group: 'healthcare', model: 'fixed', min: '17999', max: '17999', interval: 'monthly',
    note: 'Not sold on its own: Local SEO comes with the Premium plan, together with social media, blogs and a free website. SEO usually takes 4–12 months to show results, and no ranking is guaranteed.',
    included: ['Google Business Profile: categories, timings, photos and weekly posts', 'A reply to every Google review', 'Local keywords, titles, meta tags and schema', 'Doctor and department pages', 'Speed, sitemap, Search Console and broken-link fixes', 'Practo, Justdial and map listings', 'Backlinks from 25+ real sites, none bought', 'Monthly ranking report'],
    excluded: ['Ad spend', 'GST'],
  },
  {
    serviceSlug: 'health-blog-writing', label: 'Blog posting', group: 'healthcare', model: 'fixed', min: '6499', max: '6499', interval: 'monthly',
    note: 'Included in the Professional plan (2 a month) and the Premium plan (4 a month); an add-on for Basic.',
    included: ['4 doctor-reviewed articles a month', 'Published on your website', 'Shared on 25+ platforms such as Medium, LinkedIn, Quora and Practo', 'Author box with the doctor’s name, qualification and registration number', 'Each article reused as a carousel and a reel script'],
    excluded: ['GST'],
  },
  { serviceSlug: 'social-media-add-ons', label: 'Extra post', group: 'healthcare', model: 'fixed', min: '999', max: '999', excluded: ['GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Extra reel', group: 'healthcare', model: 'fixed', min: '3999', max: '3999', excluded: ['GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Extra half-day shoot', group: 'healthcare', model: 'fixed', min: '7999', max: '7999', excluded: ['Outstation travel, at cost', 'GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Full-day shoot', group: 'healthcare', model: 'fixed', min: '13999', max: '13999', excluded: ['Outstation travel, at cost', 'GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Profile reconstruction', group: 'healthcare', model: 'fixed', min: '1999', max: '1999', excluded: ['GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Extra website page', group: 'healthcare', model: 'fixed', min: '1999', max: '1999', excluded: ['GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Hindi + English website', group: 'healthcare', model: 'fixed', min: '5999', max: '5999', excluded: ['GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'M Kit token booking', group: 'healthcare', model: 'fixed', min: '4999', max: '4999', note: 'For the premium website.', excluded: ['GST'] },
  { serviceSlug: 'social-media-add-ons', label: 'Logo design', group: 'healthcare', model: 'fixed', min: '2999', max: '2999', excluded: ['GST'] },
];
