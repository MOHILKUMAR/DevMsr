import { describe, expect, it } from 'vitest';
import { hashIdentifier, issueFormToken, verifyFormToken } from '../../src/lib/security/tokens';
import { renderMarkdown, safeUrl } from '../../src/lib/content/markdown';
import { securityHeadersFor } from '../../src/lib/security/headers';
import { sanitiseLogFields } from '../../src/lib/server/logger';
import { can } from '../../src/lib/auth/types';
import { cleanText, leadFieldsSchema } from '../../src/schemas/lead';

const SECRET = 'another-test-secret-with-enough-length-123';

describe('form tokens', () => {
  it('accepts a token of reasonable age and rejects tampering', async () => {
    const now = Date.now();
    const token = await issueFormToken(SECRET, now - 10_000);
    expect(await verifyFormToken(SECRET, token, now)).toMatchObject({ ok: true });
    const [issued, sig] = token.split('.');
    expect(await verifyFormToken(SECRET, `${Number(issued) - 100}.${sig}`, now)).toMatchObject({ ok: false, reason: 'bad_signature' });
    expect(await verifyFormToken('a-different-secret-of-sufficient-length!!', token, now)).toMatchObject({ ok: false, reason: 'bad_signature' });
    expect(await verifyFormToken(SECRET, 'garbage', now)).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('hashes identifiers deterministically without revealing them', async () => {
    const a = await hashIdentifier(SECRET, 'ip', '203.0.113.7');
    expect(a).toHaveLength(32);
    expect(a).toBe(await hashIdentifier(SECRET, 'ip', '203.0.113.7'));
    expect(a).not.toContain('203');
    expect(await hashIdentifier(SECRET, 'email', 'A@B.com')).toBe(await hashIdentifier(SECRET, 'email', 'a@b.com '));
  });
});

describe('markdown rendering', () => {
  it('escapes raw HTML instead of rendering it', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops dangerous link and image URLs', () => {
    const html = renderMarkdown('[click](javascript:alert(1)) ![x](data:image/svg+xml;base64,AAA) [ok](https://example.com)');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:image');
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('only allows safe URL schemes', () => {
    expect(safeUrl('/pricing')).toBe('/pricing');
    expect(safeUrl('//evil.example')).toBeNull();
    expect(safeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(safeUrl('mailto:hi@example.com')).toBe('mailto:hi@example.com');
  });
});

describe('headers, logging and roles', () => {
  it('marks private responses no-store and noindex', () => {
    const headers = securityHeadersFor({ private: true, https: true, requestId: 'r1' });
    expect(headers['Cache-Control']).toBe('private, no-store');
    expect(headers['X-Robots-Tag']).toContain('noindex');
    expect(headers['Strict-Transport-Security']).toBeDefined();
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('redacts personal data from log fields', () => {
    const out = sanitiseLogFields({ email: 'a@b.com', nested: { phone: '+91', leadId: 'x' }, error: new Error('boom') }) as Record<string, unknown>;
    expect(out.email).toBe('[redacted]');
    expect(out.nested).toEqual({ phone: '[redacted]', leadId: 'x' });
    expect(out.error).toEqual({ name: 'Error', message: 'boom' });
  });

  it('maps roles to capabilities', () => {
    const base = { userId: 'u', profileId: 'p', email: null, displayName: 'X' };
    expect(can({ ...base, role: 'owner' }, 'leads')).toBe(true);
    expect(can({ ...base, role: 'editor' }, 'leads')).toBe(false);
    expect(can({ ...base, role: 'editor' }, 'content')).toBe(true);
    expect(can(null, 'content')).toBe(false);
  });
});

describe('lead field validation', () => {
  it('strips control characters and collapses whitespace', () => {
    expect(cleanText('  a\u0000b \n c  ')).toBe('a b c');
    expect(cleanText('line1\r\nline2\u0007', { multiline: true })).toBe('line1\nline2');
  });

  it('accepts the documented budget options only', () => {
    const base = {
      formType: 'quote',
      name: 'Asha',
      email: 'a@example.com',
      industry: 'education',
      interest: 'category:crm-erp',
      projectDescription: 'An admission CRM for our school, about 400 enquiries per season.',
      privacyAcknowledged: true,
    };
    expect(leadFieldsSchema.safeParse({ ...base, budgetRange: 'under_10k' }).success).toBe(true);
    expect(leadFieldsSchema.safeParse({ ...base, budgetRange: 'free' }).success).toBe(false);
    expect(leadFieldsSchema.safeParse({ ...base, websiteUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});
