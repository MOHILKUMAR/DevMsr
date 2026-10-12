import type { EmailMessage, EmailProvider, SendResult } from '../../src/lib/email/provider';
import type { LeadStore, NewLeadRecord, NotificationRecord } from '../../src/lib/leads/types';

/** In-memory LeadStore mirroring the database's idempotency and rate-limit semantics. */
export class MemoryLeadStore implements LeadStore {
  leads = new Map<string, NewLeadRecord & { id: string; reference: string }>();
  notifications = new Map<string, NotificationRecord & { attempts: number }>();
  activities: { leadId: string; type: string; description: string }[] = [];
  hits = new Map<string, number>();
  failCreate = false;
  failNotificationWrites = false;

  async checkRateLimit(key: string, limit: number): Promise<boolean> {
    const next = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, next);
    return next <= limit;
  }

  async createLead(input: NewLeadRecord) {
    if (this.failCreate) throw new Error('database unavailable');
    const existing = [...this.leads.values()].find((lead) => lead.submission_id === input.submission_id);
    if (existing) return { leadId: existing.id, reference: existing.reference, duplicate: true };
    const id = crypto.randomUUID();
    const reference = `DM-261012-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    this.leads.set(id, { ...input, id, reference });
    this.activities.push({ leadId: id, type: 'created', description: 'created' });
    return { leadId: id, reference, duplicate: false };
  }

  async upsertNotification(event: NotificationRecord) {
    if (this.failNotificationWrites) throw new Error('database unavailable');
    const key = `${event.leadId}:${event.eventType}`;
    const attempts = (this.notifications.get(key)?.attempts ?? 0) + event.attemptDelta;
    this.notifications.set(key, { ...event, attempts });
  }

  async recordActivity(leadId: string, type: 'notification_sent' | 'notification_failed' | 'notification_skipped', description: string) {
    this.activities.push({ leadId, type, description });
  }
}

export class FakeEmailProvider implements EmailProvider {
  readonly name = 'fake';
  sent: EmailMessage[] = [];
  constructor(private readonly behaviour: 'ok' | 'fail' | 'throw' = 'ok') {}
  async send(message: EmailMessage): Promise<SendResult> {
    if (this.behaviour === 'throw') throw new Error('network down');
    if (this.behaviour === 'fail') return { ok: false, error: 'Resend 500: upstream error', retryable: true };
    this.sent.push(message);
    return { ok: true, messageId: `msg_${this.sent.length}` };
  }
}

export function validSubmission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formType: 'quote',
    name: '  Asha   Verma ',
    email: ' Asha@Example.COM ',
    industry: 'healthcare',
    interest: 'service:opd-token-management',
    projectDescription: 'We need an OPD token system for three doctors with a TV display.',
    privacyAcknowledged: 'on',
    phone: '+91 98765 43210',
    budgetRange: '25k_50k',
    timeline: '',
    preferredContact: 'whatsapp',
    websiteUrl: 'clinic.example.in',
    submissionId: crypto.randomUUID(),
    formToken: '',
    turnstileToken: '',
    companyWebsite: '',
    sourcePath: '/request-quote',
    ...overrides,
  };
}
