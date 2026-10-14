import { describe, expect, it } from 'vitest';
import { formLink, readPrefill, resolvePrefill, toFormLink, type PrefillOptions } from '../../src/lib/forms/prefill';
import { renderMarkdown } from '../../src/lib/content/markdown';

const OPTIONS: PrefillOptions = {
  industries: ['healthcare', 'education', 'travel-tourism'],
  categories: ['pos-billing', 'crm-erp'],
  services: [
    { slug: 'admission-crm', name: 'Admission CRM', industry: 'education' },
    { slug: 'crm-updates-lead-routing', name: 'CRM updates and lead routing', industry: null },
  ],
  products: [{ slug: 'trip-desk', name: 'Trip Desk', industry: 'travel-tourism', category: 'crm-erp' }],
};

describe('form pre-fill links', () => {
  it('puts choices after "#" so crawlers see one URL per form', () => {
    expect(formLink('/request-quote', { industry: 'healthcare' })).toBe('/request-quote#industry=healthcare');
    expect(formLink('/book-a-demo', { product: 'trip-desk' })).toBe('/book-a-demo#product=trip-desk');
    expect(formLink('/request-quote', { industry: 'education', service: 'admission-crm' })).toBe('/request-quote#industry=education&service=admission-crm');
    expect(formLink('/request-quote')).toBe('/request-quote');
    expect(formLink('/request-quote', { industry: '' })).toBe('/request-quote');
  });

  it('reads "#" and "?" the same way and drops anything that is not a slug', () => {
    expect(readPrefill('#industry=education&service=admission-crm')).toEqual({ industry: 'education', service: 'admission-crm' });
    expect(readPrefill('?industry=education&utm_source=x')).toEqual({ industry: 'education' });
    expect(readPrefill('#industry=<script>&service=Admission CRM&product=../x')).toEqual({});
    expect(readPrefill('#main')).toEqual({});
    expect(readPrefill('')).toEqual({});
  });

  it('rewrites form links written in admin content, and leaves other links alone', () => {
    expect(toFormLink('/request-quote?industry=restaurants')).toBe('/request-quote#industry=restaurants');
    expect(toFormLink('https://devmsr.in/book-a-demo?product=trip-desk')).toBe('https://devmsr.in/book-a-demo#product=trip-desk');
    expect(toFormLink('/request-quote')).toBe('/request-quote');
    expect(toFormLink('/pricing?industry=restaurants')).toBe('/pricing?industry=restaurants');
    expect(toFormLink('https://example.com/request-quote?industry=x')).toBe('https://example.com/request-quote?industry=x');
    expect(renderMarkdown('[Get a quote](/request-quote?industry=healthcare)')).toContain('href="/request-quote#industry=healthcare"');
  });

  it('turns slugs into form choices as the server always has', () => {
    expect(resolvePrefill({ industry: 'education', service: 'admission-crm' }, OPTIONS)).toEqual({
      industry: 'education',
      interest: 'service:admission-crm',
      service: { value: 'service:admission-crm', label: 'Admission CRM' },
      productName: null,
    });
    // A service used by one industry implies it; a product implies its industry and category.
    expect(resolvePrefill({ service: 'admission-crm' }, OPTIONS).industry).toBe('education');
    expect(resolvePrefill({ service: 'crm-updates-lead-routing' }, OPTIONS).industry).toBe('');
    expect(resolvePrefill({ product: 'trip-desk' }, OPTIONS)).toMatchObject({ industry: 'travel-tourism', interest: 'category:crm-erp', productName: 'Trip Desk' });
    // An explicit, valid choice wins; unknown ones are ignored.
    expect(resolvePrefill({ product: 'trip-desk', industry: 'healthcare' }, OPTIONS).industry).toBe('healthcare');
    expect(resolvePrefill({ industry: 'space', category: 'nope', service: 'nope', product: 'nope' }, OPTIONS)).toEqual({ industry: '', interest: '', service: null, productName: null });
    // Without the service list (contact form), a service cannot be resolved.
    expect(resolvePrefill({ service: 'admission-crm' }, { industries: OPTIONS.industries, categories: OPTIONS.categories }).interest).toBe('');
  });
});
