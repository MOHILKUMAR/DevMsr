import { describe, expect, it } from 'vitest';
import { compareAmounts, formatAmount, isValidAmount, normaliseAmount, toPaise } from '../../src/lib/utils/money';
import { formatFromPrice, formatPrice, lowestPrice, priceMatchesBand } from '../../src/lib/catalogue/pricing';
import type { ServicePrice } from '../../src/types/catalogue';

function price(overrides: Partial<ServicePrice> = {}): ServicePrice {
  return {
    id: 'p',
    serviceSlug: 's',
    label: null,
    displayGroup: 'websites',
    pricingModel: 'range',
    minimumAmount: '25000.00',
    maximumAmount: '100000.00',
    maxOpenEnded: false,
    currency: 'INR',
    billingInterval: 'one_time',
    priceNote: null,
    includedFeatures: [],
    excludedFeatures: [],
    estimatedDelivery: null,
    taxInclusive: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe('money', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatAmount('3000')).toBe('₹3,000');
    expect(formatAmount('100000')).toBe('₹1,00,000');
    expect(formatAmount('150000.00')).toBe('₹1,50,000');
    expect(formatAmount('12345678.5')).toBe('₹1,23,45,678.50');
    expect(formatAmount('999')).toBe('₹999');
  });

  it('is exact where floating point is not', () => {
    // 0.1 + 0.2 !== 0.3 in floating point; paise arithmetic is exact.
    expect(toPaise('0.1') + toPaise('0.2')).toBe(toPaise('0.3'));
    expect(normaliseAmount('999999999999.99')).toBe('999999999999.99');
    expect(compareAmounts('1500', '1500.00')).toBe(0);
    expect(compareAmounts('9999.99', '10000')).toBe(-1);
  });

  it('validates amount strings', () => {
    expect(isValidAmount('25000')).toBe(true);
    expect(isValidAmount('25000.5')).toBe(true);
    expect(isValidAmount('-1')).toBe(false);
    expect(isValidAmount('1e5')).toBe(false);
    expect(isValidAmount('12.345')).toBe(false);
    expect(() => toPaise('abc')).toThrow(RangeError);
  });
});

describe('price formatting', () => {
  it('formats ranges, open-ended ranges and recurring fees', () => {
    expect(formatPrice(price())).toBe('₹25,000 – ₹1,00,000');
    expect(formatPrice(price({ maxOpenEnded: true }))).toBe('₹25,000 – ₹1,00,000+');
    expect(formatPrice(price({ minimumAmount: '1500', maximumAmount: '5000', billingInterval: 'monthly' }))).toBe('₹1,500 – ₹5,000/month');
    expect(formatPrice(price({ pricingModel: 'starting_from', maximumAmount: null }))).toBe('From ₹25,000');
    expect(formatPrice(price({ pricingModel: 'fixed', minimumAmount: '8000' }))).toBe('₹8,000');
    expect(formatPrice(price({ pricingModel: 'quote_only', minimumAmount: null, maximumAmount: null }))).toBe('Quote on request');
  });

  it('picks the lowest one-time starting price', () => {
    const lowest = lowestPrice([
      price({ id: 'a', minimumAmount: '15000.00' }),
      price({ id: 'b', minimumAmount: '1500.00', billingInterval: 'monthly' }),
      price({ id: 'c', minimumAmount: '8000.00' }),
      price({ id: 'd', pricingModel: 'quote_only', minimumAmount: null }),
    ]);
    expect(lowest?.id).toBe('c');
    expect(formatFromPrice(lowest!)).toBe('From ₹8,000');
  });

  it('matches budget bands by overlap', () => {
    const landing = price({ minimumAmount: '3000', maximumAmount: '8000' });
    expect(priceMatchesBand(landing, 'under-10k')).toBe(true);
    expect(priceMatchesBand(landing, '10k-25k')).toBe(false);
    const ecommerce = price({ minimumAmount: '25000', maximumAmount: '100000', maxOpenEnded: true });
    expect(priceMatchesBand(ecommerce, 'above-1l')).toBe(true);
    expect(priceMatchesBand(ecommerce, 'under-10k')).toBe(false);
    expect(priceMatchesBand(price({ pricingModel: 'quote_only', minimumAmount: null }), 'under-10k')).toBe(false);
  });
});
