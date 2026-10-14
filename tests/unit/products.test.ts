import { describe, expect, it } from 'vitest';
import { PRODUCT_CONTENT } from '../../src/data/products';
import { INDUSTRY_CONTENT } from '../../src/data/industries';
import { PRODUCT_SEED } from '../../src/data/seed/content';
import { SERVICE_SEED } from '../../src/data/seed/services';
import { PRICING_SEED } from '../../src/data/seed/pricing';

describe('product page content', () => {
  it('covers every seeded product exactly once', () => {
    expect(PRODUCT_CONTENT.map((product) => product.slug).sort()).toEqual(PRODUCT_SEED.map((product) => product.slug).sort());
  });

  it.each(PRODUCT_CONTENT.map((content) => [content.slug, content] as const))('%s points at real problems and services', (_slug, content) => {
    const seed = PRODUCT_SEED.find((product) => product.slug === content.slug)!;
    const industry = INDUSTRY_CONTENT.find((item) => item.slug === seed.industrySlug);
    // Problems come from the product's own industry page, or are given for products without one.
    if (content.problemTitles) {
      expect(industry, 'industry content').toBeDefined();
      for (const title of content.problemTitles) expect(industry!.problems.map((problem) => problem.title), title).toContain(title);
    } else {
      expect(content.problems?.length).toBeGreaterThan(0);
      expect(content.audience?.length).toBeGreaterThan(0);
    }
    for (const slug of content.buildFrom) expect(SERVICE_SEED.map((service) => service.slug), slug).toContain(slug);
    // A concept is always shown with at least one published price for building it today.
    if (seed.status === 'concept') expect(content.buildFrom.some((slug) => PRICING_SEED.some((price) => price.serviceSlug === slug))).toBe(true);
  });
});
