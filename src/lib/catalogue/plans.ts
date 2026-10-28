import type { Catalogue, ServicePrice } from '../../types/catalogue';
import type { PlanCell } from '../../data/social-media';
import { formatPrice } from './pricing';

/** The price stored under `label` for a service, or null once the admin renames or removes it. */
export function priceByLabel(catalogue: Catalogue, serviceSlug: string, label: string): ServicePrice | null {
  return catalogue.pricing.find((price) => price.serviceSlug === serviceSlug && price.label === label) ?? null;
}

/** Text for a plan table cell: its own text, or the catalogue price it names. */
export function planCellText(catalogue: Catalogue, serviceSlug: string, cell: PlanCell): string {
  if ('text' in cell) return cell.text;
  const price = priceByLabel(catalogue, serviceSlug, cell.priceLabel);
  return price ? formatPrice(price) : 'Quote on request';
}
