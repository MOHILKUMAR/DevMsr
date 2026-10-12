import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { LeadStore, NewLeadRecord, NotificationRecord } from './types';

/**
 * LeadStore backed by Supabase using the SERVER-ONLY secret key client.
 * Each method maps to a SECURITY DEFINER function or a narrow insert;
 * visitors never receive any database access themselves.
 */

const createLeadResult = z.array(
  z.object({
    lead_id: z.uuid(),
    reference_number: z.string().regex(/^DM-\d{6}-[0-9A-F]{6}$/),
    is_duplicate: z.boolean(),
  }),
);

export function createSupabaseLeadStore(client: SupabaseClient): LeadStore {
  return {
    async checkRateLimit(key, limit, windowSeconds) {
      const { data, error } = await client.rpc('check_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
      if (error) throw new Error(`check_rate_limit failed: ${error.code ?? ''} ${error.message}`);
      return data === true;
    },

    async createLead(input: NewLeadRecord) {
      const { data, error } = await client.rpc('create_lead', { p: input });
      if (error) throw new Error(`create_lead failed: ${error.code ?? ''} ${error.message}`);
      const rows = createLeadResult.parse(data);
      const row = rows[0];
      if (!row) throw new Error('create_lead returned no row');
      return { leadId: row.lead_id, reference: row.reference_number, duplicate: row.is_duplicate };
    },

    async upsertNotification(event: NotificationRecord) {
      const { error } = await client.rpc('record_notification_event', {
        p_lead_id: event.leadId,
        p_event_type: event.eventType,
        p_provider: event.provider,
        p_status: event.status,
        p_attempt_delta: event.attemptDelta,
        p_last_error: event.lastError,
        p_provider_message_id: event.providerMessageId,
        p_sent_at: event.sentAt,
      });
      if (error) throw new Error(`record_notification_event failed: ${error.message}`);
    },

    async recordActivity(leadId, type, description) {
      const { error } = await client.from('lead_activities').insert({ lead_id: leadId, activity_type: type, description, actor_id: null });
      if (error) throw new Error(`recordActivity failed: ${error.message}`);
    },
  };
}
