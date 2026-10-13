import { describe, expect, it } from 'vitest';
import { articleJsonLd, localBusinessJsonLd, parseBusinessHours, serviceJsonLd } from '../../src/lib/seo';
import { oneTimePriceRange } from '../../src/lib/catalogue/pricing';
import { catalogueLastmods } from '../../src/lib/catalogue/freshness';
import { buildBundledBlogPosts, buildBundledCatalogue } from '../../src/data/bundled-catalogue';
import { SERVICE_CATEGORY_CONTENT } from '../../src/data/service-categories';
import { INDUSTRY_CONTENT } from '../../src/data/industries';
import { BUSINESS_ADDRESS_LINE } from '../../src/data/business';
import type { SiteSettings } from '../../src/types/catalogue';

const settings: SiteSettings = {
  contactEmail: 'hello@example.com',
  contactPhone: '+91 80771 08275',
  whatsappNumber: null,
  businessHours: 'Mon–Sat, 10 am – 7 pm IST',
  serviceArea: 'Gurugram, Haryana — serving clients across India',
  announcement: null,
  leadRetentionMonths: 24,
};

describe('business hours', () => {
  it('reads the format used in admin settings', () => {
    expect(parseBusinessHours('Mon–Sat, 10 am – 7 pm IST')).toEqual({
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:00',
      closes: '19:00',
    });
    expect(parseBusinessHours('Monday-Friday 9:30am-6pm')).toEqual({ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:30', closes: '18:00' });
  });

  it('returns null rather than guessing', () => {
    for (const text of [null, '', 'By appointment', 'Sat–Mon, 10 am – 7 pm', 'Mon–Fri, 7 pm – 10 am', 'Mon–Fri, 13 am – 5 pm']) {
      expect(parseBusinessHours(text), String(text)).toBeNull();
    }
  });
});

describe('structured data', () => {
  it('describes the business with address, phone, hours and price range', () => {
    const ld = localBusinessJsonLd(settings, '₹2,000–₹1,50,000+');
    expect(ld).toMatchObject({
      '@type': 'ProfessionalService',
      '@id': 'https://devmsr.in/#business',
      logo: 'https://devmsr.in/icon-512.png',
      telephone: '+918077108275',
      email: 'hello@example.com',
      priceRange: '₹2,000–₹1,50,000+',
      address: { '@type': 'PostalAddress', addressLocality: 'Gurugram', addressRegion: 'Haryana', addressCountry: 'IN', postalCode: '122004' },
      openingHoursSpecification: [{ opens: '10:00', closes: '19:00' }],
    });
    expect(BUSINESS_ADDRESS_LINE).toContain('Orchid Business Park');
    // Nothing invented when settings are empty.
    const bare = localBusinessJsonLd({ ...settings, contactEmail: null, contactPhone: null, businessHours: null }, null);
    expect(bare).not.toHaveProperty('telephone');
    expect(bare).not.toHaveProperty('email');
    expect(bare).not.toHaveProperty('openingHoursSpecification');
    expect(bare).not.toHaveProperty('priceRange');
    expect(JSON.stringify(bare)).not.toMatch(/aggregateRating|review/i);
  });

  it('marks monthly prices as per month', () => {
    const catalogue = buildBundledCatalogue();
    const maintenance = catalogue.pricing.find((price) => price.serviceSlug === 'website-maintenance')!;
    const landing = catalogue.pricing.find((price) => price.serviceSlug === 'landing-page')!;
    const ld = serviceJsonLd({ name: 'x', description: 'y', path: '/services/x', prices: [{ label: 'Website maintenance', price: maintenance }, { label: 'Landing page', price: landing }] });
    const [monthly, oneTime] = ld.offers as { priceSpecification: Record<string, unknown> }[];
    expect(monthly!.priceSpecification).toMatchObject({ '@type': 'UnitPriceSpecification', unitCode: 'MON', minPrice: '1500.00', maxPrice: '5000.00' });
    expect(oneTime!.priceSpecification).toMatchObject({ '@type': 'PriceSpecification', minPrice: '3000.00' });
    expect(oneTime!.priceSpecification).not.toHaveProperty('unitCode');
  });

  it('gives blog posts an image and a modified date', () => {
    const post = buildBundledBlogPosts()[0]!;
    const ld = articleJsonLd({ ...post, updatedAt: '2026-10-20T08:00:00Z' });
    expect(ld).toMatchObject({ image: 'https://devmsr.in/og-default.png', dateModified: '2026-10-20T08:00:00Z', mainEntityOfPage: `https://devmsr.in/blog/${post.slug}` });
  });

  it('spans one-time prices for the price range, ignoring monthly ones', () => {
    expect(oneTimePriceRange(buildBundledCatalogue().pricing)).toBe('₹2,000–₹1,50,000+');
    expect(oneTimePriceRange([])).toBeNull();
  });
});

describe('sitemap dates', () => {
  it('dates each page by the rows it shows', () => {
    const catalogue = buildBundledCatalogue();
    const old = '2026-10-12T10:00:00Z';
    const lastmods = catalogueLastmods(catalogue, {
      services: catalogue.services.map((service) => ({ slug: service.slug, updatedAt: old })),
      prices: [{ serviceSlug: 'landing-page', updatedAt: '2026-10-14T09:00:00Z' }],
      faqs: [{ scope: 'industry', scopeKey: 'healthcare', updatedAt: '2026-10-15T09:00:00Z' }],
      industries: catalogue.industries.map((industry) => ({ slug: industry.slug, updatedAt: old })),
      products: [{ slug: 'lead-desk', updatedAt: '2026-10-13T09:00:00Z' }],
    });
    // A landing-page price edit dates web development and pricing, not POS.
    expect(lastmods.get('/services/web-development')).toBe('2026-10-14T09:00:00Z');
    expect(lastmods.get('/pricing')).toBe('2026-10-14T09:00:00Z');
    expect(lastmods.get('/services/pos-billing')).toBe(old);
    // An industry FAQ edit dates only that industry page.
    expect(lastmods.get('/industries/healthcare')).toBe('2026-10-15T09:00:00Z');
    expect(lastmods.get('/industries/education')).toBe(old);
    expect(lastmods.get('/products/lead-desk')).toBe('2026-10-13T09:00:00Z');
    expect(lastmods.has('/about')).toBe(false);
  });
});

describe('titles and descriptions fit search results', () => {
  // Full titles add " · DevMsr.in" (12 characters); Google shows about 60.
  const pages = [...SERVICE_CATEGORY_CONTENT, ...INDUSTRY_CONTENT];
  it.each(pages.map((page) => [page.slug, page] as const))('%s', (_slug, page) => {
    expect(`${page.seoTitle} · DevMsr.in`.length).toBeLessThanOrEqual(60);
    expect(page.seoDescription.length).toBeLessThanOrEqual(160);
  });
});
