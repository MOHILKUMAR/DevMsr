/**
 * The business's public identity, shared by the footer, contact and about
 * pages and the structured data, so name, address and location read the
 * same everywhere (search engines compare them). The owner chose to publish
 * the full office address on 13 Oct 2026; it matches the privacy policy.
 * Phone, email and hours are edited in /admin/settings.
 */
export const BUSINESS = {
  name: 'DevMsr.in',
  address: {
    street: 'Alt.f Coworking – Orchid Business Park, Near Subhash Chowk',
    locality: 'Gurugram',
    region: 'Haryana',
    /** ISO 3166-1 alpha-2. */
    country: 'IN',
    countryName: 'India',
    /** Not provided yet; omitted from structured data until it is. */
    postalCode: null as string | null,
  },
  /** One line for pages that mention where the business is based. */
  basedIn: 'Based in Gurugram, working with businesses across Delhi NCR and India',
} as const;

export const BUSINESS_ADDRESS_LINE = [BUSINESS.address.street, BUSINESS.address.locality, BUSINESS.address.region, BUSINESS.address.postalCode]
  .filter(Boolean)
  .join(', ');
