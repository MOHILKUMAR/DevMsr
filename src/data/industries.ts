/**
 * Industry pages: editorial copy.
 *
 * The `industries` table (name, description, sort order, active flag) is the
 * source of truth for which industries are listed. The long-form copy below
 * — operational problems, solution groupings, integrations — is reviewed in
 * Git rather than edited in the dashboard, because it is structural content.
 * Services, prices, FAQs and products shown on each page come from the
 * database.
 */

export type PreviewKind = 'opd-token' | 'room-board' | 'kitchen-tickets' | 'stock-grid' | 'itinerary' | 'fee-ledger';

export interface IndustrySeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface IndustryContent extends IndustrySeed {
  shortName: string;
  /** Lower-case plural used in section headings, e.g. "What we build for clinics and hospitals." */
  audienceLabel: string;
  heroTitle: string;
  heroIntro: string;
  audience: string[];
  problems: { title: string; detail: string }[];
  solutionGroups: { title: string; summary: string; serviceSlugs: string[] }[];
  integrations: string[];
  /** Shown prominently where a limitation needs to be stated up front. */
  caution?: string;
  preview: PreviewKind;
  seoTitle: string;
  seoDescription: string;
}

export const INDUSTRY_CONTENT: IndustryContent[] = [
  {
    slug: 'healthcare',
    name: 'Healthcare & Hospitals',
    shortName: 'Healthcare',
    audienceLabel: 'clinics and hospitals',
    icon: 'stethoscope',
    sortOrder: 10,
    description:
      'Websites, appointment booking, OPD token queues, billing and hospital management systems for clinics, doctors and hospitals.',
    heroTitle: 'Shorter OPD queues, cleaner billing, fewer calls to the front desk.',
    heroIntro:
      'We build the software a clinic or hospital uses every day: appointment booking, OPD tokens, patient registration, billing, pharmacy and lab modules, and a website patients can actually find timings on.',
    audience: ['Single-doctor and multi-doctor clinics', 'Nursing homes and small hospitals', 'Diagnostic labs and pharmacies', 'Specialist practices'],
    problems: [
      {
        title: 'Crowded waiting areas',
        detail: 'Patients arrive at the same time and wait without knowing their position. Staff spend the morning answering “how long?”.',
      },
      {
        title: 'Registration on paper or spreadsheets',
        detail: 'Patient history is split between registers, Excel sheets and the doctor’s memory, so repeat visits start from zero.',
      },
      {
        title: 'Billing that does not reconcile',
        detail: 'OPD, lab and pharmacy bills are raised in different places and the day-end total takes an hour to match.',
      },
      {
        title: 'Enquiries lost on the phone',
        detail: 'Calls and WhatsApp messages about timings and appointments are not recorded, so nobody follows up.',
      },
    ],
    solutionGroups: [
      {
        title: 'Front desk and OPD',
        summary: 'Book, register and queue patients without a crowd at the counter.',
        serviceSlugs: ['doctor-appointment-booking', 'opd-token-management', 'live-queue-dashboard', 'patient-registration-records'],
      },
      {
        title: 'Hospital operations',
        summary: 'One system for departments, doctors, billing, pharmacy and lab.',
        serviceSlugs: ['hospital-management-system', 'clinic-management-system', 'doctor-schedules-departments', 'hospital-billing', 'lab-pharmacy-modules', 'medical-inventory'],
      },
      {
        title: 'Patient communication',
        summary: 'Answer common questions and remind patients before they miss a visit.',
        serviceSlugs: ['hospital-clinic-website', 'patient-enquiry-crm', 'appointment-reminders', 'whatsapp-appointment-integration', 'ai-patient-enquiry-assistant'],
      },
      {
        title: 'Records and reporting',
        summary: 'Structured visit records and the daily numbers management asks for.',
        serviceSlugs: ['emr-ehr-modules', 'hospital-reporting-automation'],
      },
      {
        title: 'Social media and online presence',
        summary: 'Posts, reels, reviews and local search, approved by you and checked against NMC guidelines.',
        serviceSlugs: ['healthcare-social-media-management', 'social-media-3-month-plan', 'digital-presence-audit', 'local-seo', 'health-blog-writing'],
      },
    ],
    integrations: ['UPI and card payments via a payment gateway', 'SMS and approved WhatsApp Business providers', 'Email notifications', 'Barcode printers and token printers', 'TV displays for queue status', 'Export to Excel / accounting software'],
    caution:
      'Medical-record features are built to your clinical and legal requirements. We do not claim certification or regulatory compliance for any system unless that review has been completed for your deployment.',
    preview: 'opd-token',
    seoTitle: 'Hospital & Clinic Software, OPD & Appointments',
    seoDescription:
      'Hospital management systems, clinic software, OPD token queues, appointment booking and hospital websites. Indicative prices in INR.',
  },
  {
    slug: 'hotels-hospitality',
    name: 'Hotels & Hospitality',
    shortName: 'Hotels',
    audienceLabel: 'hotels',
    icon: 'bed-double',
    sortOrder: 20,
    description:
      'Hotel websites with direct booking, front-desk and reservation systems, housekeeping tracking and GST billing for hotels, resorts and homestays.',
    heroTitle: 'Take direct bookings and run the front desk from one screen.',
    heroIntro:
      'From a hotel website that takes direct bookings to a property management system for reservations, check-in, housekeeping and GST invoices — sized for independent hotels, resorts and homestays.',
    audience: ['Independent hotels and business hotels', 'Resorts and homestays', 'Guest houses and lodges', 'Hotels with an in-house restaurant'],
    problems: [
      {
        title: 'Commission on every booking',
        detail: 'Most bookings arrive through travel portals because the hotel’s own website cannot take a reservation.',
      },
      {
        title: 'Room status on a whiteboard',
        detail: 'Front desk and housekeeping do not see the same picture, so clean rooms sit empty and guests wait.',
      },
      {
        title: 'Manual GST invoices',
        detail: 'Room charges, restaurant bills and extras are added by hand at check-out, which is slow and error-prone.',
      },
      {
        title: 'No guest history',
        detail: 'Repeat guests are treated as new, and enquiries that did not convert are never followed up.',
      },
    ],
    solutionGroups: [
      {
        title: 'Direct bookings',
        summary: 'A fast hotel website with room types, photos and a booking flow.',
        serviceSlugs: ['hotel-website', 'hotel-booking-website', 'booking-enquiry-crm', 'booking-notifications'],
      },
      {
        title: 'Front office',
        summary: 'Reservations, availability, check-in and check-out in one place.',
        serviceSlugs: ['hotel-management-system', 'room-categories-availability', 'reservations-management', 'front-desk-check-in', 'guest-history'],
      },
      {
        title: 'Billing and operations',
        summary: 'GST invoices, restaurant and room-service charges, housekeeping status.',
        serviceSlugs: ['hotel-billing-gst-invoices', 'room-service-billing', 'housekeeping-room-status', 'occupancy-revenue-reports', 'offers-coupons'],
      },
    ],
    integrations: ['Payment gateway for advance payments', 'Email and approved WhatsApp booking confirmations', 'Google Maps and Business Profile links', 'Channel manager connection (scoped per provider)', 'Export to accounting software'],
    preview: 'room-board',
    seoTitle: 'Hotel Management Software & Booking Websites',
    seoDescription:
      'Hotel websites with direct booking, reservation and front-desk software, housekeeping tracking and GST billing. Indicative prices in INR.',
  },
  {
    slug: 'restaurants',
    name: 'Restaurants & Food Businesses',
    shortName: 'Restaurants',
    audienceLabel: 'restaurants',
    icon: 'utensils',
    sortOrder: 30,
    description:
      'Digital menus, POS billing, kitchen order displays, online ordering and inventory for restaurants, cafés, cloud kitchens and caterers.',
    heroTitle: 'Orders from table to kitchen to bill, without the paper slips.',
    heroIntro:
      'POS billing, kitchen order display, table and menu management, takeaway ordering and ingredient stock for restaurants, cafés and cloud kitchens.',
    audience: ['Dine-in restaurants and cafés', 'Cloud kitchens and takeaway counters', 'Bakeries and sweet shops', 'Caterers'],
    problems: [
      {
        title: 'Lost or misread kitchen slips',
        detail: 'Handwritten KOTs go missing during rush hour and orders reach the table late or wrong.',
      },
      {
        title: 'Aggregator dependence',
        detail: 'Regular customers order through apps that take a large commission and keep the customer data.',
      },
      {
        title: 'Stock that runs out mid-service',
        detail: 'Nobody knows the ingredient position until the kitchen runs out, and wastage is never measured.',
      },
      {
        title: 'Day-end totals by hand',
        detail: 'Sales by item, payment mode and staff are added up manually, so decisions are made on guesswork.',
      },
    ],
    solutionGroups: [
      {
        title: 'Billing and service',
        summary: 'Fast POS billing with tables, menus, discounts and GST invoices.',
        serviceSlugs: ['restaurant-pos-billing', 'table-menu-management', 'kitchen-order-display', 'gst-invoices-discounts', 'restaurant-management-system'],
      },
      {
        title: 'Direct orders',
        summary: 'Your own menu website and ordering flow for takeaway and delivery.',
        serviceSlugs: ['restaurant-website-digital-menu', 'online-ordering', 'order-tracking', 'delivery-management', 'payment-gateway-integration'],
      },
      {
        title: 'Back office',
        summary: 'Ingredients, suppliers, purchases and the reports that follow.',
        serviceSlugs: ['ingredient-inventory', 'supplier-purchase-management', 'automated-sales-reports'],
      },
      {
        title: 'Repeat customers',
        summary: 'Customer records, coupons and loyalty you control.',
        serviceSlugs: ['crm-systems', 'offers-coupons', 'loyalty-programs'],
      },
    ],
    integrations: ['UPI and card payment gateways', 'Thermal receipt and KOT printers', 'Approved WhatsApp order updates', 'Delivery partner links (scoped per provider)', 'Export to accounting software'],
    preview: 'kitchen-tickets',
    seoTitle: 'Restaurant POS & Digital Menu Software',
    seoDescription:
      'Restaurant POS billing, kitchen order display, digital menus, online ordering and ingredient inventory. Indicative prices in INR.',
  },
  {
    slug: 'retail-jewellery-footwear',
    name: 'Retail, Footwear & Jewellery',
    shortName: 'Retail',
    audienceLabel: 'retail stores',
    icon: 'store',
    sortOrder: 40,
    description:
      'POS billing, size- and variant-aware inventory, jewellery stock by weight and purity, barcodes, multi-store stock and online catalogues for retailers.',
    heroTitle: 'Know what is on the shelf — by size, colour, weight and store.',
    heroIntro:
      'Billing and inventory built around how you actually stock: footwear by size and colour, jewellery by weight and purity, and everything else by SKU and barcode.',
    audience: ['Footwear and apparel stores', 'Jewellery showrooms', 'General retail and supermarkets', 'Retailers with more than one branch'],
    problems: [
      {
        title: 'Variants tracked as one item',
        detail: 'A shoe model in eight sizes and three colours is stocked as one line, so the size the customer wants is never where the system says.',
      },
      {
        title: 'Jewellery valued by hand',
        detail: 'Gross weight, net weight, purity, making charges and stones are calculated on a calculator for every bill.',
      },
      {
        title: 'Branches out of sync',
        detail: 'Each store keeps its own records, so transfers and re-orders depend on phone calls.',
      },
      {
        title: 'No view of what sells',
        detail: 'Slow-moving stock sits for months while fast sellers run out, because sales data is not summarised.',
      },
    ],
    solutionGroups: [
      {
        title: 'Billing',
        summary: 'Barcode-driven POS with GST, discounts and returns.',
        serviceSlugs: ['retail-pos-billing', 'barcode-sku-management', 'offers-coupons', 'loyalty-programs'],
      },
      {
        title: 'Inventory',
        summary: 'Stock that understands sizes, colours, weights and purity.',
        serviceSlugs: ['footwear-inventory', 'jewellery-inventory', 'multi-store-inventory', 'stock-alerts-reports', 'supplier-purchase-management', 'retail-management-system'],
      },
      {
        title: 'Selling online',
        summary: 'Catalogue and e-commerce websites that use the same product data.',
        serviceSlugs: ['product-catalogue-website', 'custom-product-website', 'jewellery-website', 'ecommerce-website'],
      },
      {
        title: 'Insight',
        summary: 'Sales and stock reports you can act on.',
        serviceSlugs: ['sales-dashboards'],
      },
    ],
    integrations: ['Barcode scanners and label printers', 'UPI and card payment gateways', 'Weighing scales (model-dependent)', 'E-commerce payment and shipping providers', 'Export to accounting software'],
    preview: 'stock-grid',
    seoTitle: 'Retail POS, Footwear & Jewellery Software',
    seoDescription:
      'Retail POS and billing, footwear inventory by size and colour, jewellery billing by weight and purity, multi-store stock and e-commerce. Prices in INR.',
  },
  {
    slug: 'travel-tourism',
    name: 'Travel & Tourism',
    shortName: 'Travel',
    audienceLabel: 'travel agencies',
    icon: 'plane',
    sortOrder: 50,
    description:
      'Travel and tour package websites, itinerary builders, booking systems, enquiry CRM and quote-to-invoice workflows for travel agencies and tour operators.',
    heroTitle: 'Turn more travel enquiries into confirmed bookings.',
    heroIntro:
      'Package websites, an enquiry CRM that does not let leads go cold, itineraries clients can read on their phone, and quotes, invoices and payments that follow from the same booking.',
    audience: ['Travel agencies', 'Tour operators and DMCs', 'Pilgrimage and group-tour organisers', 'Adventure and experience providers'],
    problems: [
      {
        title: 'Enquiries scattered across WhatsApp',
        detail: 'Leads come in from calls, forms and chats, and follow-ups depend on someone remembering.',
      },
      {
        title: 'Itineraries built in Word',
        detail: 'Every quote is a new document, copied and edited by hand, with prices that go out of date.',
      },
      {
        title: 'Payments tracked separately',
        detail: 'Advance and balance payments are reconciled against bookings in a spreadsheet.',
      },
      {
        title: 'No view of the pipeline',
        detail: 'It is hard to see which enquiries are open, which are quoted and which are about to travel.',
      },
    ],
    solutionGroups: [
      {
        title: 'Websites',
        summary: 'Package and destination pages that collect qualified enquiries.',
        serviceSlugs: ['travel-agency-website', 'tour-package-website'],
      },
      {
        title: 'Sales',
        summary: 'From enquiry to quote to follow-up, in one pipeline.',
        serviceSlugs: ['travel-enquiry-crm', 'itinerary-builder', 'quote-invoice-generation', 'whatsapp-enquiry-follow-ups', 'sales-dashboards'],
      },
      {
        title: 'Bookings',
        summary: 'Reservations, customer records, payments and confirmations.',
        serviceSlugs: ['travel-booking-system', 'travel-reservation-management', 'payment-gateway-integration', 'booking-notifications', 'booking-automation'],
      },
    ],
    integrations: ['Payment gateways for advances and balances', 'Approved WhatsApp Business providers', 'Email and PDF quotes', 'Supplier or inventory APIs (scoped per provider)', 'Export to accounting software'],
    preview: 'itinerary',
    seoTitle: 'Travel Agency Websites & Travel CRM',
    seoDescription:
      'Travel and tour package websites, itinerary builders, travel booking systems and enquiry CRM for agencies. Indicative prices in INR.',
  },
  {
    slug: 'education',
    name: 'Schools & Education',
    shortName: 'Education',
    audienceLabel: 'schools',
    icon: 'graduation-cap',
    sortOrder: 60,
    description:
      'School and coaching websites, admission pages and CRM, fee management, attendance, exams and parent portals for schools and institutes.',
    heroTitle: 'Admissions, fees and attendance — without the registers.',
    heroIntro:
      'A school website parents can navigate, an admission process you can track, and a management system for students, fees, attendance, timetables and results.',
    audience: ['Schools and pre-schools', 'Coaching and tuition institutes', 'Colleges and training centres', 'Skill and language academies'],
    problems: [
      {
        title: 'Admission enquiries fall through',
        detail: 'Season enquiries come in by phone and walk-in, and there is no list of who visited, who applied and who paid.',
      },
      {
        title: 'Fee follow-up by phone',
        detail: 'Dues are tracked in a ledger, receipts are written by hand and reminders are inconsistent.',
      },
      {
        title: 'Attendance and results on paper',
        detail: 'Registers and mark sheets are compiled manually every term, which takes teacher time away from teaching.',
      },
      {
        title: 'Parents have to call',
        detail: 'Parents call the office for fee status, circulars and results because there is nowhere to look them up.',
      },
    ],
    solutionGroups: [
      {
        title: 'Admissions',
        summary: 'Campaign pages and a CRM that tracks every applicant.',
        serviceSlugs: ['school-website', 'admission-landing-pages', 'admission-crm'],
      },
      {
        title: 'Administration',
        summary: 'Students, staff, attendance, timetables and exams in one system.',
        serviceSlugs: ['school-management-system', 'student-records', 'attendance-timetable', 'exam-results', 'staff-management'],
      },
      {
        title: 'Fees',
        summary: 'Fee structures, collections, receipts and dues.',
        serviceSlugs: ['fee-management', 'fee-receipts', 'payment-gateway-integration'],
      },
      {
        title: 'Parents and students',
        summary: 'A portal and notifications that cut down office calls.',
        serviceSlugs: ['parent-student-portals', 'parent-notifications', 'school-admin-automation'],
      },
    ],
    integrations: ['Online fee payment via a payment gateway', 'SMS and approved WhatsApp providers', 'Email notifications', 'Biometric or RFID attendance devices (model-dependent)', 'Export to Excel / accounting software'],
    preview: 'fee-ledger',
    seoTitle: 'School Management Software & Admission CRM',
    seoDescription:
      'School and coaching websites, admission CRM, fee management, attendance and exam modules and parent portals. Indicative prices in INR.',
  },
];

export function getIndustryContent(slug: string): IndustryContent | undefined {
  return INDUSTRY_CONTENT.find((industry) => industry.slug === slug);
}
