import type { Catalogue } from '../../types/catalogue';
import type { ExplorerFilters, ExplorerPrice, ExplorerService } from '../../components/services/CatalogueExplorer';
import { SERVICE_CATEGORY_CONTENT } from '../../data/service-categories';
import { PRICING_GROUP_LABELS } from '../../data/seed/pricing';
import { PRICE_BANDS } from './pricing';
import { formatFromPrice, formatPrice, lowestPrice } from './pricing';
import { pricesForService, priceLabel, serviceMap } from './queries';

/** Server-side preparation of the explorer island's props. */

const MAX_QUERY = 80;

export function readExplorerFilters(url: URL, catalogue: Catalogue): ExplorerFilters {
  const get = (key: string) => (url.searchParams.get(key) ?? '').trim();
  const industry = get('industry');
  const category = get('category');
  const budget = get('budget');
  const billing = get('billing');
  // Only accept known values; anything else is ignored rather than echoed.
  return {
    q: get('q').slice(0, MAX_QUERY),
    industry: catalogue.industries.some((item) => item.slug === industry) ? industry : '',
    category: SERVICE_CATEGORY_CONTENT.some((item) => item.slug === category) ? category : '',
    budget: PRICE_BANDS.some((band) => band.id === budget) ? budget : '',
    billing: billing === 'one_time' || billing === 'recurring' ? billing : '',
  };
}

export function explorerOptions(catalogue: Catalogue) {
  return {
    industries: [...catalogue.industries].sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({ value: item.slug, label: item.name })),
    categories: SERVICE_CATEGORY_CONTENT.map((item) => ({ value: item.slug, label: item.name })),
    groups: Object.entries(PRICING_GROUP_LABELS).map(([value, meta]) => ({ value, label: meta.label })),
  };
}

export function buildExplorerServices(catalogue: Catalogue): ExplorerService[] {
  return [...catalogue.services]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((service) => {
      const lowest = lowestPrice(pricesForService(catalogue, service.slug));
      return {
        slug: service.slug,
        name: service.name,
        shortDescription: service.shortDescription,
        category: service.category,
        industrySlugs: service.industrySlugs,
        status: service.status,
        fromPrice: lowest ? formatFromPrice(lowest) : null,
      };
    });
}

export function buildExplorerPrices(catalogue: Catalogue): ExplorerPrice[] {
  const services = serviceMap(catalogue);
  return [...catalogue.pricing]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((price) => {
      const service = services.get(price.serviceSlug);
      if (!service) return [];
      return [
        {
          id: price.id,
          label: priceLabel(price, services),
          serviceSlug: price.serviceSlug,
          group: price.displayGroup,
          formatted: formatPrice(price),
          pricingModel: price.pricingModel,
          minimumAmount: price.minimumAmount,
          maximumAmount: price.maximumAmount,
          maxOpenEnded: price.maxOpenEnded,
          billingInterval: price.billingInterval,
          currency: price.currency,
          note: price.priceNote,
          included: price.includedFeatures,
          excluded: price.excludedFeatures,
          factors: price.priceFactors,
          taxInclusive: price.taxInclusive,
          estimatedDelivery: price.estimatedDelivery,
          category: service.category,
          industrySlugs: service.industrySlugs,
        },
      ];
    });
}
