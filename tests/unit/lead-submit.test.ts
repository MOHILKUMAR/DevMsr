import { describe, expect, it, vi } from 'vitest';
import { submitLead, RATE_LIMITS, type SubmitDeps } from '../../src/lib/leads/submit';
import { deliverLeadNotifications } from '../../src/lib/leads/notifications';
import { issueFormToken } from '../../src/lib/security/tokens';
import { FakeEmailProvider, MemoryLeadStore, validSubmission } from './fakes';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const NOW = Date.UTC(2026, 9, 12, 10, 0, 0);

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

function deps(overrides: Partial<SubmitDeps> = {}): SubmitDeps {
  return {
    store: new MemoryLeadStore(),
    appSecret: SECRET,
    turnstile: null,
    clientIp: '203.0.113.7',
    requestId: 'test',
    now: () => NOW,
    describe: { industry: (slug) => slug, interest: (value) => value },
    adminBaseUrl: 'https://devmsr.in',
    ...overrides,
  };
}

async function tokenAgedSeconds(seconds: number) {
  return issueFormToken(SECRET, NOW - seconds * 1000);
}

describe('submitLead', () => {
  it('normalises input, saves the lead and returns a reference', async () => {
    const store = new MemoryLeadStore();
    const result = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(30) }), deps({ store }));
    expect(result.outcome).toMatchObject({ status: 'success', duplicate: false });
    const saved = [...store.leads.values()][0]!;
    expect(saved).toMatchObject({
      name: 'Asha Verma',
      email: 'asha@example.com',
      phone: '+919876543210',
      website_url: 'https://clinic.example.in',
      industry_slug: 'healthcare',
      service_slug: 'opd-token-management',
      service_category: null,
      timeline: null,
      source: 'website:quote',
    });
    expect(result.notify?.data.reference).toBe(saved.reference);
  });

  it('returns field errors and saves nothing for invalid input', async () => {
    const store = new MemoryLeadStore();
    const result = await submitLead(
      validSubmission({ email: 'nope', projectDescription: 'short', privacyAcknowledged: '', formToken: await tokenAgedSeconds(30) }),
      deps({ store }),
    );
    expect(result.outcome.status).toBe('invalid');
    if (result.outcome.status === 'invalid') {
      expect(Object.keys(result.outcome.fieldErrors).sort()).toEqual(['email', 'privacyAcknowledged', 'projectDescription']);
    }
    expect(store.leads.size).toBe(0);
  });

  it('requires a phone number when phone or WhatsApp contact is preferred', async () => {
    const result = await submitLead(validSubmission({ phone: '', formToken: await tokenAgedSeconds(30) }), deps());
    expect(result.outcome.status).toBe('invalid');
    if (result.outcome.status === 'invalid') expect(result.outcome.fieldErrors.phone).toMatch(/phone number/);
  });

  it('rejects unknown enum values and malformed interests', async () => {
    const result = await submitLead(
      validSubmission({ budgetRange: 'one-crore', interest: 'service:../../etc', formToken: await tokenAgedSeconds(30) }),
      deps(),
    );
    expect(result.outcome.status).toBe('invalid');
  });

  it('silently drops honeypot submissions without saving', async () => {
    const store = new MemoryLeadStore();
    const result = await submitLead(validSubmission({ companyWebsite: 'http://spam.test', formToken: await tokenAgedSeconds(30) }), deps({ store }));
    expect(result.outcome.status).toBe('success');
    expect(store.leads.size).toBe(0);
    expect(result.notify).toBeUndefined();
  });

  it('rejects forms submitted too fast, with expired or forged tokens', async () => {
    const fast = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(1) }), deps());
    expect(fast.outcome).toMatchObject({ status: 'rejected', reason: 'too_fast' });
    const old = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(2 * 86400) }), deps());
    expect(old.outcome).toMatchObject({ status: 'rejected', reason: 'expired' });
    const forged = await submitLead(validSubmission({ formToken: `${Math.floor(NOW / 1000) - 60}.${'a'.repeat(64)}` }), deps());
    expect(forged.outcome.status).toBe('rejected');
    const missing = await submitLead(validSubmission({ formToken: '' }), deps());
    expect(missing.outcome.status).toBe('rejected');
  });

  it('requires a passing Turnstile check when configured', async () => {
    const turnstile = vi.fn().mockResolvedValue({ success: false, errorCodes: ['invalid-input-response'] });
    const store = new MemoryLeadStore();
    const result = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(30), turnstileToken: 'bad' }), deps({ store, turnstile }));
    expect(result.outcome).toMatchObject({ status: 'rejected', reason: 'verification' });
    expect(store.leads.size).toBe(0);
    expect(turnstile).toHaveBeenCalledWith('bad', expect.any(String));
  });

  it('rate limits repeated submissions per IP', async () => {
    const store = new MemoryLeadStore();
    const outcomes: string[] = [];
    for (let i = 0; i < RATE_LIMITS.perIpPerHour + 1; i += 1) {
      const result = await submitLead(
        validSubmission({ email: `person${i}@example.com`, formToken: await tokenAgedSeconds(30) }),
        deps({ store }),
      );
      outcomes.push(result.outcome.status);
    }
    expect(outcomes.slice(0, RATE_LIMITS.perIpPerHour).every((s) => s === 'success')).toBe(true);
    expect(outcomes.at(-1)).toBe('rejected');
    expect(store.leads.size).toBe(RATE_LIMITS.perIpPerHour);
  });

  it('is idempotent: the same submission id returns the same reference without re-notifying', async () => {
    const store = new MemoryLeadStore();
    const input = validSubmission({ formToken: await tokenAgedSeconds(30) });
    const first = await submitLead(input, deps({ store }));
    const second = await submitLead(input, deps({ store }));
    expect(second.outcome).toMatchObject({ status: 'success', duplicate: true });
    if (first.outcome.status === 'success' && second.outcome.status === 'success') expect(second.outcome.reference).toBe(first.outcome.reference);
    expect(second.notify).toBeUndefined();
    expect(store.leads.size).toBe(1);
  });

  it('reports unavailability honestly when the database is missing or failing', async () => {
    const noDb = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(30) }), deps({ store: null }));
    expect(noDb.outcome.status).toBe('unavailable');
    const store = new MemoryLeadStore();
    store.failCreate = true;
    const failing = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(30) }), deps({ store }));
    expect(failing.outcome.status).toBe('unavailable');
  });
});

describe('deliverLeadNotifications', () => {
  async function savedLead(store: MemoryLeadStore) {
    const result = await submitLead(validSubmission({ formToken: await tokenAgedSeconds(30) }), deps({ store }));
    if (!result.notify) throw new Error('expected a notification job');
    return result.notify;
  }

  it('sends the owner alert and records success', async () => {
    const store = new MemoryLeadStore();
    const provider = new FakeEmailProvider('ok');
    const job = await savedLead(store);
    await deliverLeadNotifications(store, { provider, ownerAddress: 'owner@example.com', sendAcknowledgement: true }, job, { requestId: 't' });
    expect(provider.sent.map((m) => m.to)).toEqual(['owner@example.com', 'asha@example.com']);
    expect(provider.sent[0]!.replyTo).toBe('asha@example.com');
    expect(provider.sent[0]!.idempotencyKey).toBe(`${job.leadId}:owner_new_lead`);
    expect([...store.notifications.values()].map((n) => n.status)).toEqual(['sent', 'sent']);
  });

  it('keeps the lead and records the failure when email fails', async () => {
    const store = new MemoryLeadStore();
    const job = await savedLead(store);
    await deliverLeadNotifications(store, { provider: new FakeEmailProvider('fail'), ownerAddress: 'owner@example.com', sendAcknowledgement: false }, job, {
      requestId: 't',
    });
    expect(store.leads.has(job.leadId)).toBe(true);
    const event = store.notifications.get(`${job.leadId}:owner_new_lead`)!;
    expect(event).toMatchObject({ status: 'failed', attempts: 1 });
    expect(event.lastError).toMatch(/Resend 500/);
    expect(store.activities.some((a) => a.type === 'notification_failed')).toBe(true);
  });

  it('never throws, even if the provider throws and logging fails', async () => {
    const store = new MemoryLeadStore();
    const job = await savedLead(store);
    store.failNotificationWrites = true;
    await expect(
      deliverLeadNotifications(store, { provider: new FakeEmailProvider('throw'), ownerAddress: 'owner@example.com', sendAcknowledgement: true }, job, {
        requestId: 't',
      }),
    ).resolves.toBeUndefined();
    expect(store.leads.has(job.leadId)).toBe(true);
  });

  it('records a skipped event when email is not configured', async () => {
    const store = new MemoryLeadStore();
    const job = await savedLead(store);
    await deliverLeadNotifications(store, { provider: null, ownerAddress: null, sendAcknowledgement: false }, job, { requestId: 't' });
    expect(store.notifications.get(`${job.leadId}:owner_new_lead`)).toMatchObject({ status: 'skipped', attempts: 0 });
  });

  it('escapes visitor input in the owner email', async () => {
    const store = new MemoryLeadStore();
    const result = await submitLead(
      validSubmission({ name: '<script>alert(1)</script>', formToken: await tokenAgedSeconds(30) }),
      deps({ store }),
    );
    const provider = new FakeEmailProvider('ok');
    await deliverLeadNotifications(store, { provider, ownerAddress: 'owner@example.com', sendAcknowledgement: false }, result.notify!, { requestId: 't' });
    expect(provider.sent[0]!.html).not.toContain('<script>');
    expect(provider.sent[0]!.html).toContain('&lt;script&gt;');
  });
});
