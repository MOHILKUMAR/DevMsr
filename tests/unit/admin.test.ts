import { describe, expect, it } from 'vitest';
import { pricingSchema, productSchema, portfolioSchema, faqSchema, settingsSchema, leadFollowUpSchema } from '../../src/schemas/admin';
import { formToObject } from '../../src/lib/admin/form';
import { safeAdminRedirect } from '../../src/lib/auth/redirect';
import { mergeCsp } from '../../src/lib/security/headers';

const SERVICE_ID = '7b0c4a3e-8f1d-4c7e-9a2b-1d2e3f4a5b6c';

describe('admin pricing form', () => {
  const base = {
    serviceId: SERVICE_ID,
    displayGroup: 'websites',
    pricingModel: 'range',
    currency: 'inr',
    billingInterval: 'one_time',
    minimumAmount: '25,000',
    maximumAmount: '100000',
    includedFeatures: 'A\nB\n\nA',
    sortOrder: '10',
    isActive: 'on',
  };

  it('normalises amounts to exact decimal strings and de-duplicates lines', () => {
    const parsed = pricingSchema.parse(base);
    expect(parsed.minimumAmount).toBe('25000.00');
    expect(parsed.maximumAmount).toBe('100000.00');
    expect(parsed.currency).toBe('INR');
    expect(parsed.includedFeatures).toEqual(['A', 'B']);
    expect(parsed.isActive).toBe(true);
    expect(parsed.taxInclusive).toBe(false);
  });

  it('rejects max below min, missing minimums, currency symbols and exponent notation', () => {
    expect(pricingSchema.safeParse({ ...base, maximumAmount: '1000' }).success).toBe(false);
    expect(pricingSchema.safeParse({ ...base, minimumAmount: '' }).success).toBe(false);
    expect(pricingSchema.safeParse({ ...base, minimumAmount: 'Rs 5000' }).success).toBe(false);
    expect(pricingSchema.safeParse({ ...base, minimumAmount: '5e3' }).success).toBe(false);
    expect(pricingSchema.safeParse({ ...base, pricingModel: 'quote_only', minimumAmount: '', maximumAmount: '' }).success).toBe(true);
    expect(pricingSchema.safeParse({ ...base, displayGroup: 'everything' }).success).toBe(false);
  });
});

describe('honesty guards in content forms', () => {
  const product = { name: 'Lead Desk', slug: 'lead-desk', summary: 'A lead inbox.', description: '', status: 'available', sortOrder: '1' };

  it('requires explicit confirmation before marking a product Available', () => {
    expect(productSchema.safeParse(product).success).toBe(false);
    expect(productSchema.safeParse({ ...product, confirmAvailable: 'on' }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, status: 'concept' }).success).toBe(true);
  });

  it('only accepts https screenshot URLs', () => {
    expect(productSchema.safeParse({ ...product, status: 'concept', imageUrls: 'http://example.com/a.png' }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, status: 'concept', imageUrls: 'javascript:alert(1)' }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, status: 'concept', imageUrls: 'https://example.com/a.png' }).success).toBe(true);
  });

  it('requires client permission before publishing client work', () => {
    const project = { title: 'Clinic site', slug: 'clinic-site', summary: 'A site.', description: '', projectType: 'client', isPublished: 'on' };
    expect(portfolioSchema.safeParse(project).success).toBe(false);
    expect(portfolioSchema.safeParse({ ...project, clientPermission: 'on' }).success).toBe(true);
    expect(portfolioSchema.safeParse({ ...project, isPublished: '' }).success).toBe(true);
  });
});

describe('other admin forms', () => {
  it('ties FAQ scope to its target', () => {
    const faq = { question: 'What is included?', answer: 'Everything listed.', sortOrder: '1' };
    expect(faqSchema.safeParse({ ...faq, scope: 'industry' }).success).toBe(false);
    expect(faqSchema.safeParse({ ...faq, scope: 'general' }).success).toBe(true);
  });

  it('validates settings', () => {
    expect(settingsSchema.safeParse({ serviceArea: 'India', leadRetentionMonths: '24', contactEmail: 'Hello@DevMsr.in' }).data?.contactEmail).toBe('hello@devmsr.in');
    expect(settingsSchema.safeParse({ serviceArea: 'India', leadRetentionMonths: '0' }).success).toBe(false);
    expect(settingsSchema.safeParse({ serviceArea: 'India', leadRetentionMonths: '12', whatsappNumber: 'call me' }).success).toBe(false);
  });

  it('accepts a date or an empty follow-up only', () => {
    expect(leadFollowUpSchema.parse({ id: SERVICE_ID, followUpDate: '2026-10-20' }).followUpDate).toBe('2026-10-20');
    expect(leadFollowUpSchema.parse({ id: SERVICE_ID, followUpDate: '' }).followUpDate).toBeNull();
    expect(leadFollowUpSchema.safeParse({ id: SERVICE_ID, followUpDate: 'tomorrow' }).success).toBe(false);
  });

  it('reads repeated checkbox values as arrays', () => {
    const data = new FormData();
    data.append('industryIds', 'a');
    data.append('industryIds', 'b');
    data.append('name', 'x');
    expect(formToObject(data, ['industryIds', 'missing'])).toEqual({ industryIds: ['a', 'b'], name: 'x', missing: [] });
  });
});

describe('redirect and CSP helpers', () => {
  it('never redirects off-site after login', () => {
    expect(safeAdminRedirect('/admin/leads?status=new')).toBe('/admin/leads?status=new');
    expect(safeAdminRedirect('https://evil.example/admin')).toBe('/admin');
    expect(safeAdminRedirect('//evil.example/admin')).toBe('/admin');
    expect(safeAdminRedirect('/pricing')).toBe('/admin');
    expect(safeAdminRedirect('/admin/login')).toBe('/admin');
    expect(safeAdminRedirect(undefined)).toBe('/admin');
  });

  it('merges header-only CSP directives without dropping Astro hashes', () => {
    const astro = "default-src 'self'; script-src 'self' 'sha256-abc'";
    expect(mergeCsp(astro, "frame-ancestors 'none'; default-src 'none'")).toBe(`${astro}; frame-ancestors 'none'`);
    expect(mergeCsp(null, "frame-ancestors 'none'")).toBe("frame-ancestors 'none'");
  });
});
