import type { PreviewKind } from './industries.ts';

/**
 * Product pages: structural content reviewed in Git (like industries.ts).
 *
 * The `products` table (name, status, summary, description, features) is the
 * source of truth for what is listed and how it is described; it is edited in
 * /admin/products. This file only says which illustration to show, which of the
 * industry's problems a product addresses, and which published services it is
 * built from, so the page can show live prices for building it today.
 * Products without an entry show the basic page.
 */
export interface ProductContent {
  slug: string;
  /** Illustration with sample data; never a screenshot of finished software. */
  preview: PreviewKind | 'lead-desk';
  /** Titles of problems on the product's industry page (checked by unit tests). */
  problemTitles?: string[];
  /** For products without an industry: who it is for and what it fixes. */
  audience?: string[];
  problems?: { title: string; detail: string }[];
  /** Service slugs it is built from, in order of relevance. */
  buildFrom: string[];
}

export const PRODUCT_CONTENT: ProductContent[] = [
  {
    slug: 'lead-desk',
    preview: 'lead-desk',
    audience: ['Service businesses that get enquiries through their website', 'Agencies and studios', 'Clinics, schools and travel agencies with a contact or quote form'],
    problems: [
      { title: 'Enquiries arrive as scattered emails', detail: 'Form submissions land in an inbox with no status, so nobody can tell which were answered.' },
      { title: 'Follow-ups depend on memory', detail: 'There is no follow-up date or history, so promising leads go quiet.' },
      { title: 'Spam mixed with real requests', detail: 'Bots fill the same form as customers, and real enquiries get buried.' },
    ],
    buildFrom: ['lead-management-system', 'crm-systems'],
  },
  {
    slug: 'opd-token-board',
    preview: 'opd-token',
    problemTitles: ['Crowded waiting areas'],
    buildFrom: ['opd-token-management', 'live-queue-dashboard'],
  },
  {
    slug: 'hotel-front-desk',
    preview: 'room-board',
    problemTitles: ['Room status on a whiteboard', 'Manual GST invoices'],
    buildFrom: ['hotel-management-system', 'hotel-billing-gst-invoices', 'housekeeping-room-status'],
  },
  {
    slug: 'restaurant-counter',
    preview: 'kitchen-tickets',
    problemTitles: ['Lost or misread kitchen slips', 'Stock that runs out mid-service', 'Day-end totals by hand'],
    buildFrom: ['restaurant-pos-billing', 'restaurant-management-system', 'kitchen-order-display'],
  },
  {
    slug: 'size-grid-stock',
    preview: 'stock-grid',
    problemTitles: ['Variants tracked as one item', 'No view of what sells'],
    buildFrom: ['footwear-inventory', 'retail-pos-billing', 'barcode-sku-management'],
  },
  {
    slug: 'trip-desk',
    preview: 'itinerary',
    problemTitles: ['Enquiries scattered across WhatsApp', 'Itineraries built in Word', 'Payments tracked separately', 'No view of the pipeline'],
    buildFrom: ['travel-enquiry-crm', 'travel-booking-system'],
  },
  {
    slug: 'admissions-desk',
    preview: 'fee-ledger',
    problemTitles: ['Admission enquiries fall through', 'Fee follow-up by phone'],
    buildFrom: ['admission-crm', 'admission-landing-pages', 'fee-management'],
  },
];

export function getProductContent(slug: string): ProductContent | undefined {
  return PRODUCT_CONTENT.find((product) => product.slug === slug);
}
