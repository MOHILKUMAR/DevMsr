import { describe, expect, it } from 'vitest';
import { buildBundledCatalogue } from '../../src/data/bundled-catalogue';
import { getServiceCategoryContent } from '../../src/data/service-categories';
import { SOCIAL_MEDIA_DETAILS } from '../../src/data/social-media';
import { FAQ_SEED } from '../../src/data/seed/content';
import { PRICING_SEED } from '../../src/data/seed/pricing';
import { formatFromPrice, lowestPrice } from '../../src/lib/catalogue/pricing';
import { planCellText, priceByLabel } from '../../src/lib/catalogue/plans';
import { pricesForService } from '../../src/lib/catalogue/queries';

const catalogue = buildBundledCatalogue();
const { plans, audit } = SOCIAL_MEDIA_DETAILS;

describe('social media management page', () => {
  it('names only prices that exist, so no plan cell falls back to "Quote on request"', () => {
    for (const row of plans.prices) {
      for (const cell of row.cells) {
        if ('priceLabel' in cell) expect(PRICING_SEED.some((p) => p.serviceSlug === row.serviceSlug && p.label === cell.priceLabel), cell.priceLabel).toBe(true);
      }
    }
    expect(priceByLabel(catalogue, audit.serviceSlug, audit.priceLabel)).not.toBeNull();
  });

  it('has one value per plan in every row of the table', () => {
    for (const row of plans.features) expect(row.values, row.feature).toHaveLength(plans.columns.length);
    for (const row of plans.prices) expect(row.cells, row.label).toHaveLength(plans.columns.length);
  });

  it('shows catalogue prices in the plan table', () => {
    const [threeMonth, partner] = plans.prices;
    expect(threeMonth!.cells.map((cell) => planCellText(catalogue, threeMonth!.serviceSlug, cell))).toEqual(['₹68,996', '₹91,996', 'Partner Plan only']);
    expect(partner!.cells.map((cell) => planCellText(catalogue, partner!.serviceSlug, cell))).toEqual(['₹18,999/month', '₹23,999/month', '₹43,998/month']);
    // A label renamed in the admin shows "Quote on request" rather than a stale price.
    expect(planCellText(catalogue, partner!.serviceSlug, { priceLabel: 'Renamed plan' })).toBe('Quote on request');
  });

  it('quotes the plan, not a ₹999 add-on, as the "from" price', () => {
    const content = getServiceCategoryContent('social-media-management')!;
    const lowest = lowestPrice(pricesForService(catalogue, content.fromPriceService!));
    expect(formatFromPrice(lowest!)).toBe('From ₹18,999/month');
  });

  it('answers common questions on the page', () => {
    expect(FAQ_SEED.filter((faq) => faq.scope === 'service_category' && faq.scopeKey === 'social-media-management').length).toBeGreaterThanOrEqual(8);
  });
});
