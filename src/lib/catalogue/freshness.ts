import type { Catalogue, FaqScope } from '../../types/catalogue';

/**
 * When each public catalogue row last changed (its updated_at), for sitemap
 * <lastmod> dates. Only rows visitors can see are included (RLS applies).
 */
export interface CatalogueFreshness {
  services: { slug: string; updatedAt: string }[];
  prices: { serviceSlug: string; updatedAt: string }[];
  faqs: { scope: FaqScope; scopeKey: string | null; updatedAt: string }[];
  industries: { slug: string; updatedAt: string }[];
  products: { slug: string; updatedAt: string }[];
}

function latest(dates: (string | undefined)[]): string | undefined {
  let best: string | undefined;
  let bestTime = -Infinity;
  for (const date of dates) {
    const time = date ? Date.parse(date) : NaN;
    if (!Number.isNaN(time) && time > bestTime) {
      best = date;
      bestTime = time;
    }
  }
  return best;
}

/**
 * Last-changed date for each catalogue-driven page, from the rows that page
 * shows. Code changes are not tracked here; pages whose content lives in code
 * only (about, contact, legal pages) get no date rather than a guessed one.
 */
export function catalogueLastmods(catalogue: Catalogue, freshness: CatalogueFreshness): Map<string, string> {
  const serviceDate = new Map<string, string | undefined>();
  for (const service of freshness.services) serviceDate.set(service.slug, service.updatedAt);
  for (const price of freshness.prices) serviceDate.set(price.serviceSlug, latest([serviceDate.get(price.serviceSlug), price.updatedAt]));

  const faqDates = (scope: FaqScope, key: string | null = null) =>
    freshness.faqs.filter((faq) => faq.scope === scope && (key === null || faq.scopeKey === key)).map((faq) => faq.updatedAt);
  const servicesWhere = (test: (service: Catalogue['services'][number]) => boolean) =>
    catalogue.services.filter(test).map((service) => serviceDate.get(service.slug));

  const allServices = servicesWhere(() => true);
  const allIndustries = freshness.industries.map((industry) => industry.updatedAt);
  const allProducts = freshness.products.map((product) => product.updatedAt);
  const allPrices = freshness.prices.map((price) => price.updatedAt);

  const dates = new Map<string, string | undefined>([
    ['/', latest([...allServices, ...allIndustries, ...allProducts, ...faqDates('general')])],
    ['/services', latest(allServices)],
    ['/industries', latest([...allIndustries, ...allServices])],
    ['/pricing', latest([...allPrices, ...faqDates('pricing'), ...faqDates('general')])],
    ['/products', latest(allProducts)],
  ]);
  for (const category of new Set(catalogue.services.map((service) => service.category))) {
    dates.set(`/services/${category}`, latest([...servicesWhere((service) => service.category === category), ...faqDates('service_category', category)]));
  }
  for (const industry of freshness.industries) {
    dates.set(
      `/industries/${industry.slug}`,
      latest([industry.updatedAt, ...servicesWhere((service) => service.industrySlugs.includes(industry.slug)), ...faqDates('industry', industry.slug)]),
    );
  }
  for (const product of freshness.products) dates.set(`/products/${product.slug}`, product.updatedAt);

  return new Map([...dates].filter((entry): entry is [string, string] => entry[1] !== undefined));
}
