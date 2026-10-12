import type { BlogPost, Faq, ServicePrice } from '../types/catalogue';

/**
 * JSON-LD builders. They only describe facts that exist on the page:
 * no ratings, reviews, addresses or customer counts are ever emitted.
 */

export const SITE_URL = 'https://devmsr.in';

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(contactEmail: string | null): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DevMsr.in',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description: 'Websites, custom business software and AI automation for Indian businesses.',
    areaServed: 'IN',
    ...(contactEmail ? { email: contactEmail } : {}),
  };
}

export function websiteJsonLd(): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DevMsr.in', url: SITE_URL };
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

/** A Service with indicative price ranges taken from the live pricing data. */
export function serviceJsonLd(input: { name: string; description: string; path: string; prices: { label: string; price: ServicePrice }[] }): JsonLd {
  const offers = input.prices
    .filter(({ price }) => price.minimumAmount && price.pricingModel !== 'quote_only')
    .map(({ label, price }) => ({
      '@type': 'Offer',
      name: label,
      priceCurrency: price.currency,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: price.currency,
        minPrice: price.minimumAmount,
        ...(price.maximumAmount && !price.maxOpenEnded ? { maxPrice: price.maximumAmount } : {}),
        valueAddedTaxIncluded: price.taxInclusive,
      },
    }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: new URL(input.path, SITE_URL).toString(),
    provider: { '@type': 'Organization', name: 'DevMsr.in', url: SITE_URL },
    areaServed: 'IN',
    ...(offers.length > 0 ? { offers } : {}),
  };
}

export function articleJsonLd(post: BlogPost): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: new URL(`/blog/${post.slug}`, SITE_URL).toString(),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    author: { '@type': 'Organization', name: 'DevMsr.in' },
    publisher: { '@type': 'Organization', name: 'DevMsr.in', url: SITE_URL },
  };
}

export function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}
