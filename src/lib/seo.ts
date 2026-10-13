import type { BlogPost, Faq, ServicePrice, SiteSettings } from '../types/catalogue';
import { BUSINESS } from '../data/business';

/**
 * JSON-LD builders. They only describe facts that exist on the page: no
 * ratings, reviews or customer counts are ever emitted. The business address
 * is the one the owner chose to publish (src/data/business.ts).
 */

export const SITE_URL = 'https://devmsr.in';

/** Stable id so services and articles can point at the one business entity. */
export const BUSINESS_ID = `${SITE_URL}/#business`;

type JsonLd = Record<string, unknown>;

const DAY_CODES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const SCHEMA_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/**
 * Reads business hours written like "Mon–Sat, 10 am – 7 pm IST" (as entered
 * in /admin/settings). Returns null for anything it cannot read with
 * certainty, so structured data never states hours that were not intended.
 */
export function parseBusinessHours(text: string | null): { days: string[]; opens: string; closes: string } | null {
  if (!text) return null;
  const match = /^\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[–—-]\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*,?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\s*[–—-]\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i.exec(text);
  if (!match) return null;
  const dayIndex = (value: string) => DAY_CODES.findIndex((code) => code.toLowerCase() === value.slice(0, 2).toLowerCase());
  const first = dayIndex(match[1]!);
  const last = dayIndex(match[2]!);
  if (first < 0 || last < first) return null;
  const time = (hour: string, minute: string | undefined, half: string) => {
    const h = Number(hour);
    if (h < 1 || h > 12) return null;
    const h24 = (h % 12) + (half.toLowerCase() === 'pm' ? 12 : 0);
    return `${String(h24).padStart(2, '0')}:${minute ?? '00'}`;
  };
  const opens = time(match[3]!, match[4], match[5]!);
  const closes = time(match[6]!, match[7], match[8]!);
  if (!opens || !closes || closes <= opens) return null;
  return { days: SCHEMA_DAYS.slice(first, last + 1), opens, closes };
}

/** "+91 80771 08275" → "+918077108275". */
function e164(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
}

/** The business as a local professional service: name, address, contact details and hours. */
export function localBusinessJsonLd(settings: SiteSettings, priceRange: string | null): JsonLd {
  const hours = parseBusinessHours(settings.businessHours);
  const telephone = e164(settings.contactPhone);
  const { address } = BUSINESS;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': BUSINESS_ID,
    name: BUSINESS.name,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/og-default.png`,
    description: 'Websites, custom business software and AI automation for hospitals, hotels, restaurants, retailers, travel companies and schools.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.locality,
      addressRegion: address.region,
      addressCountry: address.country,
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
    },
    areaServed: { '@type': 'Country', name: address.countryName },
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(telephone ? { telephone } : {}),
    ...(hours ? { openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: hours.days, opens: hours.opens, closes: hours.closes }] } : {}),
    ...(priceRange ? { priceRange } : {}),
  };
}

export function websiteJsonLd(): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: BUSINESS.name, url: SITE_URL, publisher: { '@id': BUSINESS_ID } };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}

export function faqJsonLd(faqs: Faq[]): JsonLd | null {
  if (faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/** UN/CEFACT unit codes for recurring prices (schema.org UnitPriceSpecification). */
const UNIT_CODES: Partial<Record<ServicePrice['billingInterval'], { unitCode: string; unitText: string }>> = {
  monthly: { unitCode: 'MON', unitText: 'month' },
  yearly: { unitCode: 'ANN', unitText: 'year' },
};

/** A Service with indicative price ranges taken from the live pricing data. */
export function serviceJsonLd(input: { name: string; description: string; path: string; prices: { label: string; price: ServicePrice }[] }): JsonLd {
  const offers = input.prices
    .filter(({ price }) => price.minimumAmount && price.pricingModel !== 'quote_only')
    .map(({ label, price }) => {
      const unit = UNIT_CODES[price.billingInterval];
      return {
        '@type': 'Offer',
        name: label,
        priceCurrency: price.currency,
        priceSpecification: {
          '@type': unit ? 'UnitPriceSpecification' : 'PriceSpecification',
          priceCurrency: price.currency,
          minPrice: price.minimumAmount,
          ...(price.maximumAmount && !price.maxOpenEnded ? { maxPrice: price.maximumAmount } : {}),
          ...(unit ?? {}),
          valueAddedTaxIncluded: price.taxInclusive,
        },
      };
    });
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: new URL(input.path, SITE_URL).toString(),
    provider: { '@type': 'ProfessionalService', '@id': BUSINESS_ID, name: BUSINESS.name, url: SITE_URL },
    areaServed: { '@type': 'Country', name: BUSINESS.address.countryName },
    ...(offers.length > 0 ? { offers } : {}),
  };
}

export function articleJsonLd(post: BlogPost): JsonLd {
  const url = new URL(`/blog/${post.slug}`, SITE_URL).toString();
  const image = post.coverImage ? new URL(post.coverImage, SITE_URL).toString() : `${SITE_URL}/og-default.png`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url,
    mainEntityOfPage: url,
    image,
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ?? post.publishedAt ? { dateModified: post.updatedAt ?? post.publishedAt } : {}),
    author: { '@type': 'Organization', name: BUSINESS.name, url: SITE_URL },
    publisher: { '@type': 'Organization', '@id': BUSINESS_ID, name: BUSINESS.name, url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` } },
  };
}

export function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}
