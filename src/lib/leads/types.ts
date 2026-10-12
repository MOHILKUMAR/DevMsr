import type { LeadSubmission } from '../../schemas/lead';

/** Persistence operations used by lead intake. Implemented with Supabase in production and in-memory in tests. */
export interface LeadStore {
  /** Returns true when the request is within the limit. */
  checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
  createLead(input: NewLeadRecord): Promise<{ leadId: string; reference: string; duplicate: boolean }>;
  upsertNotification(event: NotificationRecord): Promise<void>;
  recordActivity(leadId: string, type: 'notification_sent' | 'notification_failed' | 'notification_skipped', description: string): Promise<void>;
}

export interface NewLeadRecord {
  submission_id: string;
  form_type: LeadSubmission['formType'];
  name: string;
  email: string;
  business_name: string | null;
  phone: string | null;
  industry_slug: string | null;
  service_slug: string | null;
  service_category: string | null;
  project_description: string;
  budget_range: string | null;
  timeline: string | null;
  preferred_contact: string | null;
  website_url: string | null;
  consultation_time: string | null;
  source: string;
  source_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

export type NotificationEventType = 'owner_new_lead' | 'lead_acknowledgement';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface NotificationRecord {
  leadId: string;
  eventType: NotificationEventType;
  provider: string;
  status: NotificationStatus;
  /** Increment applied to attempt_count. */
  attemptDelta: number;
  lastError: string | null;
  providerMessageId: string | null;
  sentAt: string | null;
}

export type SubmitOutcome =
  | { status: 'success'; reference: string; duplicate: boolean }
  | { status: 'invalid'; fieldErrors: Record<string, string>; message: string }
  | { status: 'rejected'; reason: 'verification' | 'too_fast' | 'expired' | 'rate_limited'; message: string }
  | { status: 'unavailable'; message: string };
