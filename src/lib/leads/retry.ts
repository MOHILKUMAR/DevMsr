import type { SupabaseClient } from '@supabase/supabase-js';
import { BUDGET_RANGES, CONTACT_METHODS, TIMELINES } from '../../schemas/lead';
import { getServiceCategoryContent } from '../../data/service-categories';
import type { LeadEmailData } from '../email/templates';
import { deliverLeadNotifications, type NotificationSettings } from './notifications';
import type { LeadStore, NotificationEventType } from './types';

/** Columns needed to rebuild a lead's notification email. */
export const LEAD_EMAIL_COLUMNS =
  'id, reference_number, form_type, name, email, business_name, phone, project_description, budget_range, timeline, preferred_contact, website_url, consultation_time, service_category, industries(name), services(name)';

export interface LeadEmailRow {
  id: string;
  reference_number: string;
  form_type: 'contact' | 'quote' | 'demo';
  name: string;
  email: string;
  business_name: string | null;
  phone: string | null;
  project_description: string;
  budget_range: string | null;
  timeline: string | null;
  preferred_contact: string | null;
  website_url: string | null;
  consultation_time: string | null;
  service_category: string | null;
  industries: { name: string } | null;
  services: { name: string } | null;
}

const label = (list: readonly { value: string; label: string }[], value: string | null) => list.find((item) => item.value === value)?.label;

export function leadEmailData(lead: LeadEmailRow, origin: string): LeadEmailData {
  return {
    reference: lead.reference_number,
    formType: lead.form_type,
    name: lead.name,
    email: lead.email,
    businessName: lead.business_name ?? undefined,
    phone: lead.phone ?? undefined,
    industry: lead.industries?.name ?? 'Other / not listed',
    interest: lead.services?.name ?? getServiceCategoryContent(lead.service_category ?? '')?.name ?? 'Not sure yet',
    budget: label(BUDGET_RANGES, lead.budget_range),
    timeline: label(TIMELINES, lead.timeline),
    preferredContact: label(CONTACT_METHODS, lead.preferred_contact),
    websiteUrl: lead.website_url ?? undefined,
    consultationTime: lead.consultation_time ?? undefined,
    projectDescription: lead.project_description,
    adminUrl: `${origin}/admin/leads/${lead.id}`,
  };
}

export const MAX_AUTOMATIC_ATTEMPTS = 5;

/**
 * Retries failed or stuck notifications (used by the scheduled endpoint).
 * Gives up after MAX_AUTOMATIC_ATTEMPTS; the dashboard still allows a
 * manual retry. Returns counts only — never lead content.
 */
export async function retryPendingNotifications(
  serviceClient: SupabaseClient,
  store: LeadStore,
  settings: NotificationSettings,
  options: { origin: string; requestId: string; limit?: number },
): Promise<{ attempted: number; sent: number }> {
  const { data, error } = await serviceClient
    .from('notification_events')
    .select(`event_type, attempt_count, leads(${LEAD_EMAIL_COLUMNS})`)
    .in('status', ['failed', 'pending'])
    .lt('attempt_count', MAX_AUTOMATIC_ATTEMPTS)
    .lt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('updated_at')
    .limit(options.limit ?? 10);
  if (error) throw new Error(`notification lookup failed: ${error.message}`);

  const rows = (data ?? []) as unknown as { event_type: NotificationEventType; leads: LeadEmailRow | null }[];
  let sent = 0;
  for (const row of rows) {
    if (!row.leads) continue;
    const perJob = { ...settings, sendAcknowledgement: settings.sendAcknowledgement || row.event_type === 'lead_acknowledgement' };
    await deliverLeadNotifications(store, perJob, { leadId: row.leads.id, data: leadEmailData(row.leads, options.origin) }, { requestId: options.requestId, only: [row.event_type] });
    const { data: after } = await serviceClient.from('notification_events').select('status').eq('lead_id', row.leads.id).eq('event_type', row.event_type).maybeSingle();
    if ((after as { status?: string } | null)?.status === 'sent') sent += 1;
  }
  return { attempted: rows.length, sent };
}
