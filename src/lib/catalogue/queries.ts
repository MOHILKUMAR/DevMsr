import type { Catalogue, Faq, FaqScope, Product, Service, ServiceCategorySlug, ServicePrice } from '../../types/catalogue';

/** Pure selectors over a loaded catalogue. No I/O, safe to unit test. */

const bySortOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

export function serviceMap(catalogue: Catalogue): Map<string, Service> {
  return new Map(catalogue.services.map((service) => [service.slug, service]));
}

export function servicesForIndustry(catalogue: Catalogue, industrySlug: string): Service[] {
  return catalogue.services.filter((service) => service.industrySlugs.includes(industrySlug)).sort(bySortOrder);
}

export function servicesForCategory(catalogue: Catalogue, category: ServiceCategorySlug): Service[] {
  return catalogue.services.filter((service) => service.category === category).sort(bySortOrder);
}

export function pricesForService(catalogue: Catalogue, serviceSlug: string): ServicePrice[] {
  return catalogue.pricing.filter((price) => price.serviceSlug === serviceSlug).sort(bySortOrder);
}

export function pricesForServices(catalogue: Catalogue, services: Service[]): ServicePrice[] {
  const slugs = new Set(services.map((service) => service.slug));
  return catalogue.pricing.filter((price) => slugs.has(price.serviceSlug)).sort(bySortOrder);
}

export function faqsFor(catalogue: Catalogue, scope: FaqScope, scopeKey: string | null = null): Faq[] {
  return catalogue.faqs.filter((faq) => faq.scope === scope && (scopeKey === null || faq.scopeKey === scopeKey)).sort(bySortOrder);
}

export function productsForIndustry(catalogue: Catalogue, industrySlug: string): Product[] {
  return catalogue.products.filter((product) => product.industrySlug === industrySlug).sort(bySortOrder);
}

export function productsForCategory(catalogue: Catalogue, category: ServiceCategorySlug): Product[] {
  return catalogue.products.filter((product) => product.serviceCategory === category).sort(bySortOrder);
}

/** Price label shown in tables: explicit label, otherwise the service name. */
export function priceLabel(price: ServicePrice, services: Map<string, Service>): string {
  return price.label ?? services.get(price.serviceSlug)?.name ?? price.serviceSlug;
}

/** Resolves an ordered list of slugs to services, skipping inactive/missing ones. */
export function resolveServices(services: Map<string, Service>, slugs: string[]): Service[] {
  return slugs.map((slug) => services.get(slug)).filter((service): service is Service => service !== undefined);
}
