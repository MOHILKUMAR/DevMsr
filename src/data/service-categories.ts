import type { ServiceCategorySlug } from '../types/catalogue.ts';
import { SOCIAL_MEDIA_DETAILS, type RetainerDetails } from './social-media.ts';

/**
 * Service category pages (/services/[slug]): editorial copy.
 *
 * Individual services, prices and FAQs are database-driven and attached to
 * these categories via `services.category`.
 */

export interface RecurringCost {
  item: string;
  note: string;
}

export interface ServiceCategoryContent {
  slug: ServiceCategorySlug;
  name: string;
  navLabel: string;
  icon: string;
  tagline: string;
  intro: string;
  whatItDoes: string;
  whoNeedsIt: string[];
  keyFeatures: string[];
  useCases: string[];
  included: string[];
  excluded: string[];
  /** Typical range, always confirmed in the written quote. */
  typicalTimeline: string;
  dependencies: string[];
  recurringCosts: RecurringCost[];
  seoTitle: string;
  seoDescription: string;
  /** Service whose lowest price is the category's "from" figure, when the cheapest item is an add-on rather than the service itself. */
  fromPriceService?: string;
  /** Replaces the development-fee wording above the price list, for categories sold as fixed plans. */
  pricingIntro?: string;
  nextSteps?: string[];
  /** Plan table, process and terms for a monthly service (see src/data/social-media.ts). */
  retainer?: RetainerDetails;
}

const HOSTING_COST: RecurringCost = {
  item: 'Hosting',
  note: 'Many small sites fit within free hosting tiers; busier sites or apps may need a paid plan. Billed by the provider, not included in development fees.',
};
const DOMAIN_COST: RecurringCost = {
  item: 'Domain renewal',
  note: 'Paid yearly to your domain registrar.',
};
const MAINTENANCE_COST: RecurringCost = {
  item: 'Maintenance (optional)',
  note: 'Updates, fixes and small changes after launch. See website and application maintenance pricing.',
};
const GATEWAY_COST: RecurringCost = {
  item: 'Payment gateway fees',
  note: 'A percentage per transaction, charged by the gateway provider.',
};
const MESSAGING_COST: RecurringCost = {
  item: 'SMS / WhatsApp message charges',
  note: 'Charged per message or conversation by the messaging provider.',
};
const AI_USAGE_COST: RecurringCost = {
  item: 'AI provider usage',
  note: 'Charged by the AI provider based on usage. We estimate it with you before launch.',
};

export const SERVICE_CATEGORY_CONTENT: ServiceCategoryContent[] = [
  {
    slug: 'web-development',
    name: 'Website Development',
    navLabel: 'Websites',
    icon: 'layout-template',
    tagline: 'Websites that load fast, read clearly and turn visits into enquiries.',
    intro:
      'Landing pages, business websites, portfolios, blogs, product showcases and booking sites — designed around what your visitors need to know and the one thing you want them to do next.',
    whatItDoes:
      'We plan the pages, write or edit the copy with you, design the layout, build it, connect forms to your inbox, set up search-engine basics and put it live on your domain.',
    whoNeedsIt: ['Businesses without a website, or with one that no longer represents them', 'Professionals who need a portfolio or profile site', 'Teams launching a product, campaign or event', 'Businesses that want enquiries to arrive in one place'],
    keyFeatures: ['Responsive layouts for phones, tablets and desktops', 'Contact and enquiry forms with spam protection', 'Page titles, descriptions, sitemap and social previews', 'Accessible structure: headings, labels and keyboard navigation', 'Editable content where you need it', 'Analytics setup on request'],
    useCases: ['A one-page landing page for an ad campaign', 'A five-to-ten page company website', 'A doctor, lawyer or consultant profile site', 'A product showcase with enquiry buttons', 'A redesign of an outdated site'],
    included: ['Page planning and layout design', 'Build and responsive testing', 'Contact form connected to your email', 'Basic on-page SEO setup', 'Deployment to your domain', 'A short handover walkthrough'],
    excluded: ['Domain purchase and renewal', 'Paid hosting plans', 'Professional photography', 'Paid stock images or fonts', 'Ongoing content writing (available separately)', 'Paid advertising'],
    typicalTimeline: 'About 1–2 weeks for a landing page and 2–5 weeks for a business website, depending on content readiness. Confirmed in your quote.',
    dependencies: ['Your logo, photos and business details', 'Access to your domain’s DNS settings', 'Timely feedback on drafts'],
    recurringCosts: [DOMAIN_COST, HOSTING_COST, MAINTENANCE_COST],
    seoTitle: 'Website Development Company in Gurugram',
    seoDescription:
      'Landing pages, business websites, portfolios, blogs and redesigns. Responsive, fast and search-ready, with indicative prices in INR.',
  },
  {
    slug: 'ecommerce',
    name: 'E-commerce',
    navLabel: 'E-commerce',
    icon: 'shopping-bag',
    tagline: 'An online store you own, with payments, orders and stock in sync.',
    intro:
      'Product catalogues, carts, checkout, payment gateways, order management and shipping workflows — built for your products, whether that means sizes and colours, weights and purity, or simple SKUs.',
    whatItDoes:
      'We set up your catalogue, product pages, cart and checkout, integrate a payment gateway, build an order dashboard and connect stock so the website and the shop do not oversell.',
    whoNeedsIt: ['Retailers adding an online channel', 'Brands selling directly instead of only through marketplaces', 'Restaurants and bakeries taking direct orders', 'Businesses with a catalogue that changes often'],
    keyFeatures: ['Product variants (size, colour, weight, purity)', 'Cart, checkout and payment gateway', 'Order dashboard and status updates', 'Coupons and discounts', 'Order emails and optional WhatsApp updates', 'Stock sync with your POS where scoped'],
    useCases: ['A footwear store selling by size and colour', 'A jewellery catalogue with enquiry or checkout', 'A bakery’s pre-order site', 'A brand moving customers off marketplaces'],
    included: ['Store design and product page templates', 'Catalogue setup for an agreed number of products', 'Payment gateway integration (test and live)', 'Order management dashboard', 'Launch on your domain'],
    excluded: ['Payment gateway account and transaction fees', 'Shipping provider charges', 'Product photography and descriptions at scale', 'Marketplace listing management', 'Paid plugins or themes'],
    typicalTimeline: 'About 4–10 weeks depending on catalogue size, integrations and payment-gateway approval time. Confirmed in your quote.',
    dependencies: ['An approved payment gateway account in your business name', 'Product data, prices and images', 'Shipping and returns policies'],
    recurringCosts: [GATEWAY_COST, HOSTING_COST, DOMAIN_COST, MAINTENANCE_COST],
    seoTitle: 'E-commerce Website Development with Payments',
    seoDescription:
      'Online stores with variants, payment gateways, order management and stock sync. Built for retail, footwear, jewellery and food businesses.',
  },
  {
    slug: 'custom-software',
    name: 'Custom Software',
    navLabel: 'Custom software',
    icon: 'blocks',
    tagline: 'Software shaped around your process, not the other way round.',
    intro:
      'Web applications, internal tools, dashboards and database-driven systems for work that spreadsheets and off-the-shelf apps no longer handle well.',
    whatItDoes:
      'We map the process with the people who do the work, agree a first version with a clear scope, build it in reviewable steps, and hand over an application your team can log in to and use.',
    whoNeedsIt: ['Teams running core work in spreadsheets', 'Businesses paying for several tools that do not talk to each other', 'Founders building a first version of a product', 'Operations that need role-based access and audit history'],
    keyFeatures: ['Role-based logins and permissions', 'Forms, workflows and approvals', 'Search, filters and exports', 'Dashboards and reports', 'Audit history of important changes', 'APIs for other systems'],
    useCases: ['An internal order-tracking tool', 'A field-staff reporting app', 'A quotation and job-card system', 'A customer portal', 'A startup MVP'],
    included: ['Requirement workshop and written scope', 'Interface design for the agreed screens', 'Development, testing and deployment', 'Admin user setup and handover', 'Documentation for the delivered features'],
    excluded: ['Features outside the written scope', 'Third-party licences and API fees', 'Data cleaning beyond the agreed migration', 'Hardware'],
    typicalTimeline: 'A focused first version usually takes 4–12 weeks. Larger systems are delivered in phases. Confirmed in your quote.',
    dependencies: ['Access to the people who run the process today', 'Sample data and documents', 'A decision-maker for scope questions'],
    recurringCosts: [HOSTING_COST, MAINTENANCE_COST, { item: 'Third-party services', note: 'Any paid APIs or services the application depends on.' }],
    seoTitle: 'Custom Software Development in Gurugram',
    seoDescription:
      'Custom web applications, internal tools, dashboards and database-driven systems built around your process. Indicative prices in INR.',
  },
  {
    slug: 'management-systems',
    name: 'Management Systems',
    navLabel: 'Management systems',
    icon: 'layout-dashboard',
    tagline: 'Hospital, hotel, restaurant, retail, travel and school systems.',
    intro:
      'Industry management systems that cover the daily work: registrations, bookings, stock, schedules, billing and reports. We start with a focused MVP and extend it as you use it.',
    whatItDoes:
      'We configure a management system for your industry, adapt the screens and rules to your process, migrate the records you need, train your staff and support the first weeks of live use.',
    whoNeedsIt: ['Hospitals and clinics', 'Hotels and resorts', 'Restaurants and cloud kitchens', 'Retailers with variant or multi-store stock', 'Travel agencies', 'Schools and institutes'],
    keyFeatures: ['Industry-specific workflows', 'Role-based staff access', 'Billing and GST invoices where relevant', 'Daily, monthly and custom reports', 'Data export', 'Notifications by email, SMS or approved WhatsApp providers'],
    useCases: ['Hospital OPD, billing and pharmacy', 'Hotel reservations and housekeeping', 'Restaurant tables, KOT and stock', 'Footwear stock by size and colour', 'School fees and attendance'],
    included: ['Process mapping and MVP scope', 'Configuration and customisation within scope', 'Import of agreed master data', 'Staff training session', 'Post-launch support period agreed in the quote'],
    excluded: ['Hardware (printers, scanners, displays)', 'Historical data migration beyond the agreed scope', 'Regulatory certification', 'Third-party licences and messaging charges'],
    typicalTimeline: 'An MVP usually takes 6–12 weeks, including testing with your staff. Confirmed in your quote.',
    dependencies: ['Staff availability for walkthroughs and testing', 'Master data: items, rooms, doctors, classes, prices', 'Hardware decisions for printers and scanners'],
    recurringCosts: [HOSTING_COST, MAINTENANCE_COST, MESSAGING_COST],
    seoTitle: 'Hospital, Hotel & School Management Software',
    seoDescription:
      'Industry management systems for hospitals, hotels, restaurants, retail, travel and schools. MVP-first delivery with indicative prices in INR.',
  },
  {
    slug: 'pos-billing',
    name: 'POS & Billing',
    navLabel: 'POS & billing',
    icon: 'receipt',
    tagline: 'Fast counters, correct GST invoices and day-end totals that match.',
    intro:
      'Point-of-sale and billing software for restaurants, retail stores, hotels, clinics and institutes — with barcodes, discounts, GST, receipts and the reports your accountant asks for.',
    whatItDoes:
      'We set up items, taxes and payment modes, design invoice formats, connect printers and scanners, and give you reports by item, staff, payment mode and day.',
    whoNeedsIt: ['Restaurants and cafés', 'Retail, footwear and jewellery stores', 'Hotels billing rooms and restaurant together', 'Clinics and hospitals', 'Institutes issuing fee receipts'],
    keyFeatures: ['Quick billing with search and barcodes', 'GST-ready invoices and credit notes', 'Discounts, coupons and loyalty', 'Multiple payment modes including UPI', 'Thermal and A4 print formats', 'Day-end and period reports'],
    useCases: ['Restaurant table billing with KOT', 'Retail barcode billing', 'Hotel check-out invoices', 'Hospital OPD and lab bills', 'Fee receipts'],
    included: ['Item, tax and payment-mode setup', 'Invoice and receipt formats', 'Printer and scanner setup for supported models', 'Staff training', 'Basic reports'],
    excluded: ['Printers, scanners and cash drawers', 'Accounting software licences', 'Tax filing or accounting advice', 'Payment gateway fees'],
    typicalTimeline: 'About 3–6 weeks depending on integrations and hardware. Confirmed in your quote.',
    dependencies: ['Your GST details and invoice requirements', 'Item and price lists', 'Supported printer and scanner models'],
    recurringCosts: [HOSTING_COST, MAINTENANCE_COST, GATEWAY_COST],
    seoTitle: 'POS & Billing Software for Shops & Restaurants',
    seoDescription:
      'POS billing with GST invoices, barcodes, discounts and reports for restaurants, retail, hotels and clinics. Indicative prices in INR.',
  },
  {
    slug: 'crm-erp',
    name: 'CRM & ERP',
    navLabel: 'CRM & ERP',
    icon: 'contact',
    tagline: 'Every enquiry, customer and follow-up in one place.',
    intro:
      'Lead management, enquiry CRMs, customer records and ERP modules for purchases, suppliers and staff — focused on the pipeline and the follow-ups that bring in revenue.',
    whatItDoes:
      'We bring enquiries from your website, phone and WhatsApp into one pipeline, define stages that match your sales process, add reminders and reports, and connect the modules you need next.',
    whoNeedsIt: ['Businesses losing leads between calls and chats', 'Sales teams that need follow-up reminders', 'Admissions and booking teams', 'Businesses outgrowing spreadsheets for purchases and staff'],
    keyFeatures: ['Lead capture from website forms', 'Pipeline stages and follow-up dates', 'Notes and activity history', 'Search, filters and exports', 'Purchase, supplier and staff modules', 'Role-based access'],
    useCases: ['A travel enquiry pipeline', 'A school admission CRM', 'A patient enquiry desk', 'A supplier and purchase register', 'An employee directory with leave tracking'],
    included: ['Pipeline and field design', 'Website form integration', 'User accounts and roles', 'Import of existing leads from a spreadsheet', 'Training and handover'],
    excluded: ['Paid CRM licences', 'Telephony or WhatsApp provider fees', 'Data cleaning beyond the agreed import'],
    typicalTimeline: 'About 3–8 weeks depending on modules and integrations. Confirmed in your quote.',
    dependencies: ['Your current lead sources and stages', 'Existing data in a spreadsheet, if migrating'],
    recurringCosts: [HOSTING_COST, MAINTENANCE_COST, MESSAGING_COST],
    seoTitle: 'CRM & ERP Software for Small Businesses',
    seoDescription:
      'Enquiry CRMs, lead management, customer records and ERP modules for purchases, suppliers and staff. Indicative prices in INR.',
  },
  {
    slug: 'ai-automation',
    name: 'AI & Workflow Automation',
    navLabel: 'Automation',
    icon: 'workflow',
    tagline: 'Take repetitive work off your team, and keep a person in the loop.',
    intro:
      'Workflow automation with n8n and APIs: lead routing, reminders, email and spreadsheet automation, document data extraction and scheduled reports. AI is used only where it actually helps.',
    whatItDoes:
      'We find the repetitive steps in your process, automate them with dependable tools, add checks and human approval for anything consequential, and document how the workflow runs.',
    whoNeedsIt: ['Teams copying data between forms, sheets and email', 'Businesses sending the same reminders every day', 'Operations that receive documents and re-type them', 'Managers who assemble the same report every week'],
    keyFeatures: ['n8n workflows (self-hosted or cloud)', 'Lead routing and CRM updates', 'Scheduled reports and alerts', 'Email and spreadsheet automation', 'Document data extraction with review', 'Error notifications and retry'],
    useCases: ['New enquiry → CRM entry → owner alert → follow-up reminder', 'Daily sales summary to WhatsApp or email', 'Invoices or forms → extracted fields → spreadsheet', 'Appointment reminders a day before'],
    included: ['Process review and workflow design', 'Building and testing the workflow', 'Error handling and alerts', 'Documentation and handover'],
    excluded: ['Paid automation platform plans', 'AI provider usage', 'Messaging provider charges', 'Changes to third-party systems we do not control'],
    typicalTimeline: 'Simple workflows take days; multi-step automations about 1–4 weeks. Confirmed in your quote.',
    dependencies: ['API access or exports from the tools involved', 'Sample data and edge cases'],
    recurringCosts: [AI_USAGE_COST, MESSAGING_COST, { item: 'Automation platform', note: 'n8n can be self-hosted; managed plans are billed by the provider.' }],
    seoTitle: 'Workflow Automation & n8n Development',
    seoDescription:
      'n8n workflows, lead routing, reminders, email and spreadsheet automation and document extraction. Indicative prices in INR.',
  },
  {
    slug: 'ai-agents-chatbots',
    name: 'AI Agents & Chatbots',
    navLabel: 'AI chatbots',
    icon: 'message-square',
    tagline: 'Chatbots that answer from your information and hand over to a person.',
    intro:
      'Website FAQ chatbots, lead qualification assistants, WhatsApp Business bots and internal knowledge assistants grounded in your own content.',
    whatItDoes:
      'We collect and structure the information the assistant may use, design the conversation and hand-off rules, connect it to your website or approved WhatsApp provider, and test it against real questions.',
    whoNeedsIt: ['Businesses answering the same questions all day', 'Sales teams that want enquiries qualified before a call', 'Teams with documents nobody can find in time'],
    keyFeatures: ['Answers grounded in your approved content', 'Lead capture and qualification questions', 'Hand-off to a person', 'Conversation logs for review', 'Usage limits to control cost', 'Clear disclosure that replies are AI-generated'],
    useCases: ['A clinic FAQ assistant for timings and services', 'A travel enquiry qualifier', 'A WhatsApp bot for order status', 'An internal policy assistant'],
    included: ['Knowledge preparation for agreed content', 'Conversation and hand-off design', 'Website or WhatsApp integration', 'Testing and tuning', 'Admin access to logs'],
    excluded: ['AI provider usage', 'WhatsApp Business provider and message charges', 'Content creation beyond the agreed scope'],
    typicalTimeline: 'About 2–6 weeks depending on content and channels. Confirmed in your quote.',
    dependencies: ['Approved source content', 'An approved WhatsApp Business provider account for WhatsApp bots'],
    recurringCosts: [AI_USAGE_COST, MESSAGING_COST, HOSTING_COST],
    seoTitle: 'AI Chatbots & WhatsApp Bots for Business',
    seoDescription:
      'Website FAQ chatbots, WhatsApp Business bots, lead qualification and knowledge assistants grounded in your content. Indicative prices in INR.',
  },
  {
    slug: 'voice-ai',
    name: 'Voice AI',
    navLabel: 'Voice AI',
    icon: 'phone-call',
    tagline: 'Call assistants and consent-based calling, with a human hand-off.',
    intro:
      'Voice agents that answer routine calls — timings, bookings, order status — and calling workflows for reminders and follow-ups that respect consent and opt-out rules.',
    whatItDoes:
      'We design the call flows, connect a telephony provider and a voice AI service, define when the call goes to a person, and set up logging and review.',
    whoNeedsIt: ['Clinics and hotels with high inbound call volume', 'Businesses that send many routine reminders', 'Teams that need after-hours call handling'],
    keyFeatures: ['Inbound call answering for routine questions', 'Appointment booking by voice', 'Transfer to a person', 'Call summaries and logs', 'Consent and opt-out handling for outbound calls'],
    useCases: ['Appointment confirmation calls for a clinic', 'After-hours booking enquiries for a hotel', 'Order-status calls for a restaurant'],
    included: ['Call-flow design', 'Telephony and voice AI integration', 'Hand-off and escalation rules', 'Testing and launch support'],
    excluded: ['Telephony provider rental and per-minute charges', 'Voice AI usage charges', 'Phone numbers and regulatory registrations'],
    typicalTimeline: 'About 3–8 weeks including provider setup and testing. Confirmed in your quote.',
    dependencies: ['A telephony provider account and number', 'Registration and consent processes required by Indian telecom rules for outbound calling'],
    recurringCosts: [AI_USAGE_COST, { item: 'Telephony', note: 'Number rental and per-minute charges from the telephony provider.' }],
    seoTitle: 'AI Voice Agents & Calling Workflows',
    seoDescription:
      'Inbound voice agents and consent-based outbound calling workflows with human hand-off. Scoped per project; usage costs disclosed upfront.',
  },
  {
    slug: 'integrations-payments',
    name: 'Integrations & Payments',
    navLabel: 'Integrations',
    icon: 'plug',
    tagline: 'Connect your systems to payments, messaging and the tools you use.',
    intro:
      'Payment gateways, email, SMS and approved WhatsApp providers, APIs and webhooks, CRM and accounting integrations, and secure login systems.',
    whatItDoes:
      'We integrate the provider in test mode, verify every success and failure path on the server, then switch to live mode once the provider has approved your account.',
    whoNeedsIt: ['Businesses accepting online payments', 'Teams sending confirmations and reminders', 'Systems that need to share data with accounting or CRM tools'],
    keyFeatures: ['Server-side payment verification', 'Signed webhook handling', 'Idempotent processing to avoid double entries', 'Email, SMS and approved WhatsApp messaging', 'REST APIs and webhooks', 'Authentication and roles'],
    useCases: ['Online fee or advance payment', 'Booking confirmations by email and WhatsApp', 'Sending invoices to accounting software', 'A partner API for your system'],
    included: ['Integration in test mode', 'Success, failure and retry handling', 'Switch to live mode', 'Documentation of the integration'],
    excluded: ['Provider account fees and per-transaction or per-message charges', 'Provider approval timelines', 'Changes required on systems we do not control'],
    typicalTimeline: 'Usually 1–3 weeks per integration, plus provider approval time. Confirmed in your quote.',
    dependencies: ['Your account with the provider (gateway, messaging, accounting)', 'API documentation and credentials, shared securely'],
    recurringCosts: [GATEWAY_COST, MESSAGING_COST],
    seoTitle: 'Payment Gateway, WhatsApp and API Integrations',
    seoDescription:
      'Payment gateway integration, email, SMS and approved WhatsApp messaging, APIs, webhooks and accounting integrations. Indicative prices in INR.',
  },
  {
    slug: 'hosting-maintenance',
    name: 'Hosting, Maintenance & Support',
    navLabel: 'Hosting & support',
    icon: 'server-cog',
    tagline: 'Keep your website and software secure, backed up and working.',
    intro:
      'Domain and DNS setup, hosting and deployment, monthly maintenance, bug fixes, backups, performance tuning, security updates and monitoring.',
    whatItDoes:
      'We set up hosting and deployment, then look after updates, backups, uptime checks and fixes on a monthly plan or per request.',
    whoNeedsIt: ['Businesses without in-house technical staff', 'Sites that have become slow or insecure', 'Applications that need regular updates and backups'],
    keyFeatures: ['Domain, DNS and SSL setup', 'Deployment pipelines', 'Scheduled backups and restore checks', 'Dependency and security updates', 'Uptime monitoring', 'Bug fixes and small changes'],
    useCases: ['Moving a site to faster hosting', 'Monthly care for a business website', 'Support for a custom application', 'Fixing a broken or slow site'],
    included: ['Setup or migration as scoped', 'Agreed monthly hours or tasks for maintenance plans', 'Monthly summary of work done'],
    excluded: ['Hosting provider bills', 'Domain renewals', 'New features beyond the plan’s hours', 'Recovery of data that was never backed up'],
    typicalTimeline: 'Setup in days; maintenance is ongoing.',
    dependencies: ['Access to hosting, domain and code repositories'],
    recurringCosts: [HOSTING_COST, DOMAIN_COST],
    seoTitle: 'Website Hosting & Maintenance Services',
    seoDescription:
      'Domain and DNS setup, hosting and deployment, website and application maintenance, backups, security updates and monitoring.',
  },
  {
    slug: 'social-media-management',
    name: 'Social Media Management',
    navLabel: 'Social media',
    icon: 'megaphone',
    tagline: 'You treat patients. We handle your social media.',
    intro:
      'Posts, reels, stories, review replies, blogs and local search for doctors, clinics and hospitals: shot at your hospital, checked against NMC guidelines and published only after you approve on WhatsApp.',
    whatItDoes:
      'We plan a monthly calendar with you, shoot at your hospital, design posts and edit reels, publish to Instagram, Facebook, YouTube, LinkedIn and X, reply to comments, messages and Google reviews, and send you a monthly report. Your website is part of every plan.',
    whoNeedsIt: [
      'Hospitals and nursing homes with inactive or inconsistent pages',
      'Clinics and specialist practices building a local reputation',
      'Doctors who want to educate patients without spending OPD time on content',
      'Practices unsure what the NMC advertising guidelines allow',
    ],
    keyFeatures: [
      'Posts, reels, carousels and stories on 5 platforms',
      'A monthly shoot at your hospital, not stock photos or AI',
      'Health-camp, awareness and festival campaigns',
      'Replies to comments, messages and every Google review',
      'Doctor-reviewed blogs and Local SEO on higher plans',
      'Every post checked against NMC guidelines',
    ],
    useCases: [
      'Announcing a BP and sugar screening camp',
      'Dengue and heatstroke awareness in season',
      'A doctor’s introduction reel with qualification and registration number',
      'Diwali and Doctors’ Day greetings planned a month ahead',
      'Collecting genuine feedback with a QR code at reception',
    ],
    included: [
      '5 social profiles set up with a brand kit',
      '12 posts, 4 reels, 5 carousels and 15 stories a month',
      'One shoot a month at your hospital',
      'Daily replies to comments and messages',
      'Google review replies and a feedback QR',
      'A website, with hosting for year 1',
      'A monthly report and a dedicated account manager',
    ],
    excluded: [
      'Ad spend, paid directly to the platforms',
      'Influencer fees',
      'Paid verification badges',
      'Outstation travel for shoots (at cost)',
      'Guaranteed followers, reach or rankings',
      'Patient testimonials or before-and-after posts',
    ],
    typicalTimeline: 'Profiles set up, website live and first shoot in month 1. Plans run for 3 or 12 months.',
    dependencies: [
      'Accurate practice details: doctors, qualifications, registration numbers and timings',
      'Delegated access to your social, Google and website accounts',
      'Approvals on WhatsApp within 2 working days',
      'A 2-hour slot at your hospital for the monthly shoot',
      'Consent from anyone shown on camera',
    ],
    recurringCosts: [
      { item: 'Ad spend (optional)', note: 'Paid by you directly to Meta, Google or other platforms. We never hold ad budgets.' },
      { item: 'Website renewal from year 2', note: 'Hosting and upkeep: ₹6,999 a year for a static site, ₹11,999 a year for a premium site.' },
      DOMAIN_COST,
    ],
    seoTitle: 'Social Media Management for Doctors & Hospitals',
    seoDescription:
      'Posts, reels, review replies, blogs and Local SEO for doctors, clinics and hospitals, shot at your hospital and checked against NMC guidelines.',
    fromPriceService: 'healthcare-social-media-management',
    pricingIntro:
      'These are our standard rates, before 18% GST. Your final fee is agreed after an initial consultation and confirmed in a written proposal, and may vary with the scope we agree: for example the number of doctors, departments or branches, shoot requirements and any add-ons.',
    nextSteps: [
      'Book the audit, or send a quote request with your hospital’s details.',
      'We send your audit file with a costed 3-month plan.',
      'You choose a plan, sign the proposal and we start in week one.',
    ],
    retainer: SOCIAL_MEDIA_DETAILS,
  },
];

export function getServiceCategoryContent(slug: string): ServiceCategoryContent | undefined {
  return SERVICE_CATEGORY_CONTENT.find((category) => category.slug === slug);
}
