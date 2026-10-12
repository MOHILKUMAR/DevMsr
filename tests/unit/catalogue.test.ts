import { describe, expect, it } from 'vitest';
import { INDUSTRY_CONTENT } from '../../src/data/industries';
import { SERVICE_CATEGORY_CONTENT } from '../../src/data/service-categories';
import { SERVICE_SEED } from '../../src/data/seed/services';
import { PRICING_SEED } from '../../src/data/seed/pricing';
import { FAQ_SEED, PRODUCT_SEED } from '../../src/data/seed/content';
import { buildBundledCatalogue } from '../../src/data/bundled-catalogue';
import { ICON_NAMES } from '../../src/lib/catalogue/icons';
import { catalogueResponseSchema } from '../../src/lib/catalogue/schema';
import { SERVICE_CATEGORY_SLUGS } from '../../src/types/catalogue';

const serviceSlugs = new Set(SERVICE_SEED.map((s) => s.slug));
const industrySlugs = new Set(INDUSTRY_CONTENT.map((i) => i.slug));

describe('catalogue integrity', () => {
  it('has the six required industries and eleven service categories', () => {
    expect([...industrySlugs].sort()).toEqual(
      ['education', 'healthcare', 'hotels-hospitality', 'restaurants', 'retail-jewellery-footwear', 'travel-tourism'].sort(),
    );
    expect(SERVICE_CATEGORY_CONTENT.map((c) => c.slug)).toEqual([...SERVICE_CATEGORY_SLUGS]);
  });

  it('has unique service slugs that match the database pattern', () => {
    expect(serviceSlugs.size).toBe(SERVICE_SEED.length);
    for (const slug of serviceSlugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('links services only to known industries', () => {
    for (const service of SERVICE_SEED) for (const industry of service.industries) expect(industrySlugs.has(industry), `${service.slug} → ${industry}`).toBe(true);
  });

  it('references only existing services from industry pages, prices and products', () => {
    for (const industry of INDUSTRY_CONTENT) {
      for (const group of industry.solutionGroups) {
        for (const slug of group.serviceSlugs) expect(serviceSlugs.has(slug), `${industry.slug}: ${slug}`).toBe(true);
      }
    }
    for (const row of PRICING_SEED) expect(serviceSlugs.has(row.serviceSlug), `price: ${row.serviceSlug}`).toBe(true);
    for (const product of PRODUCT_SEED) if (product.industrySlug) expect(industrySlugs.has(product.industrySlug)).toBe(true);
    for (const faq of FAQ_SEED) if (faq.scope === 'industry') expect(industrySlugs.has(faq.scopeKey ?? '')).toBe(true);
  });

  it('lists every service from the brief somewhere on an industry page', () => {
    // Industry-specific services must appear in that industry's solution groups.
    for (const industry of INDUSTRY_CONTENT) {
      const onPage = new Set(industry.solutionGroups.flatMap((group) => group.serviceSlugs));
      const linked = SERVICE_SEED.filter((service) => service.industries.length === 1 && service.industries[0] === industry.slug);
      for (const service of linked) expect(onPage.has(service.slug), `${industry.slug} page is missing ${service.slug}`).toBe(true);
    }
  });

  it('seeds every price from the brief with a valid range', () => {
    expect(PRICING_SEED).toHaveLength(43);
    for (const row of PRICING_SEED) {
      expect(Number(row.max)).toBeGreaterThanOrEqual(Number(row.min));
    }
  });

  it('only uses icons the renderer knows', () => {
    const icons = new Set<string>(ICON_NAMES);
    for (const industry of INDUSTRY_CONTENT) expect(icons.has(industry.icon), industry.icon).toBe(true);
    for (const category of SERVICE_CATEGORY_CONTENT) expect(icons.has(category.icon), category.icon).toBe(true);
  });

  it('never labels a seeded product as Available', () => {
    expect(PRODUCT_SEED.filter((p) => p.status === 'available')).toHaveLength(0);
  });

  it('bundled catalogue round-trips through the database response schema', () => {
    const bundled = buildBundledCatalogue();
    // Shape the bundled catalogue like the SQL function output and parse it.
    const asDb = {
      industries: bundled.industries.map((i) => ({ id: i.id, slug: i.slug, name: i.name, description: i.description, icon: i.icon, sort_order: i.sortOrder })),
      services: bundled.services.map((s) => ({
        id: s.id, slug: s.slug, name: s.name, short_description: s.shortDescription, description: s.description, category: s.category,
        features: s.features, status: s.status, sort_order: s.sortOrder, industry_slugs: s.industrySlugs, seo_title: null, seo_description: null,
      })),
      pricing: bundled.pricing.map((p) => ({
        id: p.id, service_slug: p.serviceSlug, label: p.label, display_group: p.displayGroup, pricing_model: p.pricingModel,
        minimum_amount: p.minimumAmount, maximum_amount: p.maximumAmount, max_open_ended: p.maxOpenEnded, currency: p.currency,
        billing_interval: p.billingInterval, price_note: p.priceNote, included_features: p.includedFeatures, excluded_features: p.excludedFeatures,
        estimated_delivery: null, tax_inclusive: false, sort_order: p.sortOrder,
      })),
      products: [],
      faqs: [],
      settings: { service_area: 'India', lead_retention_months: 24 },
    };
    const parsed = catalogueResponseSchema.parse(asDb);
    expect(parsed.pricing).toEqual(bundled.pricing);
    expect(parsed.services).toEqual(bundled.services);
  });
});
