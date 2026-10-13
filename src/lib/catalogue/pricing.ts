import type { BillingInterval, ServicePrice } from '../../types/catalogue.ts';
import { compareAmounts, formatAmount } from '../utils/money.ts';

const INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  one_time: '',
  monthly: '/month',
  yearly: '/year',
  per_use: ' per use',
};

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  yearly: 'Yearly',
  per_use: 'Usage-based',
};

export const PRICING_MODEL_LABELS = {
  fixed: 'Fixed price',
  starting_from: 'Starting price',
  range: 'Price range',
  quote_only: 'Quote only',
  usage_based: 'Usage-based',
} as const;

type PriceShape = Pick<ServicePrice, 'pricingModel' | 'minimumAmount' | 'maximumAmount' | 'maxOpenEnded' | 'currency' | 'billingInterval'>;

/**
 * Human-readable price, e.g. "₹25,000 – ₹1,00,000+", "From ₹2,000",
 * "₹1,500 – ₹5,000/month" or "Quote on request".
 */
export function formatPrice(price: PriceShape): string {
  const suffix = INTERVAL_SUFFIX[price.billingInterval];
  const min = price.minimumAmount ? formatAmount(price.minimumAmount, price.currency) : null;
  const max = price.maximumAmount ? formatAmount(price.maximumAmount, price.currency) : null;
  const plus = price.maxOpenEnded ? '+' : '';

  switch (price.pricingModel) {
    case 'quote_only':
      return 'Quote on request';
    case 'fixed':
      return min ? `${min}${suffix}` : 'Quote on request';
    case 'starting_from':
      return min ? `From ${min}${suffix}` : 'Quote on request';
    case 'usage_based':
      return min ? `From ${min}${suffix || ' + usage'}` : 'Usage-based';
    case 'range':
      if (min && max) return `${min} – ${max}${plus}${suffix}`;
      if (min) return `From ${min}${suffix}`;
      return 'Quote on request';
  }
}

/** Short "from" figure for teasers, e.g. "From ₹8,000". */
export function formatFromPrice(price: PriceShape): string {
  if (price.pricingModel === 'quote_only' || !price.minimumAmount) return 'Quote on request';
  const suffix = INTERVAL_SUFFIX[price.billingInterval];
  return `From ${formatAmount(price.minimumAmount, price.currency)}${suffix}`;
}

/** Billing intervals that count towards "from" figures. Yearly and usage-based prices are left out. */
const FROM_PRICE_INTERVALS: ReadonlySet<BillingInterval> = new Set(['one_time', 'monthly']);

/**
 * Lowest active one-time or monthly minimum among prices, or null. Used for
 * "from" badges; formatFromPrice adds "/month" when the lowest is monthly.
 */
export function lowestPrice<T extends PriceShape>(prices: T[]): T | null {
  let lowest: T | null = null;
  for (const price of prices) {
    if (!price.minimumAmount || price.pricingModel === 'quote_only') continue;
    if (!FROM_PRICE_INTERVALS.has(price.billingInterval)) continue;
    if (!lowest || !lowest.minimumAmount || compareAmounts(price.minimumAmount, lowest.minimumAmount) < 0) {
      lowest = price;
    }
  }
  return lowest;
}

/** Budget bands used by the pricing filter, in rupees as decimal strings. */
export const PRICE_BANDS = [
  { id: 'under-10k', label: 'Under ₹10,000', min: null, max: '10000' },
  { id: '10k-25k', label: '₹10,000 – ₹25,000', min: '10000', max: '25000' },
  { id: '25k-50k', label: '₹25,000 – ₹50,000', min: '25000', max: '50000' },
  { id: '50k-1l', label: '₹50,000 – ₹1,00,000', min: '50000', max: '100000' },
  { id: 'above-1l', label: 'Above ₹1,00,000', min: '100000', max: null },
] as const;
export type PriceBandId = (typeof PRICE_BANDS)[number]['id'];

/**
 * True when a price range overlaps a budget band. Quote-only and usage
 * prices without a minimum never match a band.
 */
export function priceMatchesBand(price: PriceShape, bandId: PriceBandId): boolean {
  const band = PRICE_BANDS.find((b) => b.id === bandId);
  if (!band || !price.minimumAmount) return false;
  const low = price.minimumAmount;
  const high = price.maxOpenEnded || !price.maximumAmount ? null : price.maximumAmount;
  // Overlap test: price.low < band.max AND (price.high is open OR price.high >= band.min)
  const belowBandMax = band.max === null || compareAmounts(low, band.max) < 0;
  const aboveBandMin = band.min === null || high === null || compareAmounts(high, band.min) >= 0;
  return belowBandMax && aboveBandMin;
}
