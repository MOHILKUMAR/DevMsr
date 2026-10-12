import type { EmailProvider } from '../email/provider';
import { acknowledgementEmail, ownerNotificationEmail, type LeadEmailData } from '../email/templates';
import { log } from '../server/logger';
import type { LeadStore, NotificationEventType } from './types';

export interface NotificationSettings {
  provider: EmailProvider | null;
  ownerAddress: string | null;
  sendAcknowledgement: boolean;
}

export interface NotificationTarget {
  leadId: string;
  data: LeadEmailData;
}

/**
 * Sends the owner alert (and optional acknowledgement) for a saved lead and
 * records each outcome in notification_events + the lead's activity history.
 *
 * Never throws: a failed or unconfigured email must not affect the lead,
 * which is already committed before this runs. Failed events stay visible in
 * the dashboard and can be retried.
 */
export async function deliverLeadNotifications(
  store: LeadStore,
  settings: NotificationSettings,
  target: NotificationTarget,
  options: { requestId: string; only?: NotificationEventType[] } = { requestId: '' },
): Promise<void> {
  const jobs: { type: NotificationEventType; to: string | null; build: () => { subject: string; html: string; text: string } }[] = [
    { type: 'owner_new_lead', to: settings.ownerAddress, build: () => ownerNotificationEmail(target.data) },
  ];
  if (settings.sendAcknowledgement) {
    jobs.push({ type: 'lead_acknowledgement', to: target.data.email, build: () => acknowledgementEmail(target.data) });
  }

  for (const job of jobs) {
    if (options.only && !options.only.includes(job.type)) continue;
    try {
      if (!settings.provider || !job.to) {
        const reason = !settings.provider ? 'Email provider not configured' : 'Recipient not configured';
        await store.upsertNotification({
          leadId: target.leadId,
          eventType: job.type,
          provider: settings.provider?.name ?? 'none',
          status: 'skipped',
          attemptDelta: 0,
          lastError: reason,
          providerMessageId: null,
          sentAt: null,
        });
        await store.recordActivity(target.leadId, 'notification_skipped', `${labelFor(job.type)} not sent: ${reason.toLowerCase()}`);
        log.warn('lead.notification_skipped', { requestId: options.requestId, leadId: target.leadId, type: job.type, reason });
        continue;
      }

      const message = job.build();
      const result = await settings.provider.send({
        to: job.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: job.type === 'owner_new_lead' ? target.data.email : undefined,
        idempotencyKey: `${target.leadId}:${job.type}`,
      });

      if (result.ok) {
        await store.upsertNotification({
          leadId: target.leadId,
          eventType: job.type,
          provider: settings.provider.name,
          status: 'sent',
          attemptDelta: 1,
          lastError: null,
          providerMessageId: result.messageId,
          sentAt: new Date().toISOString(),
        });
        await store.recordActivity(target.leadId, 'notification_sent', `${labelFor(job.type)} sent`);
        log.info('lead.notification_sent', { requestId: options.requestId, leadId: target.leadId, type: job.type });
      } else {
        await store.upsertNotification({
          leadId: target.leadId,
          eventType: job.type,
          provider: settings.provider.name,
          status: 'failed',
          attemptDelta: 1,
          lastError: result.error.slice(0, 1000),
          providerMessageId: null,
          sentAt: null,
        });
        await store.recordActivity(target.leadId, 'notification_failed', `${labelFor(job.type)} failed — can be retried from the dashboard`);
        log.error('lead.notification_failed', { requestId: options.requestId, leadId: target.leadId, type: job.type, retryable: result.retryable });
      }
    } catch (error) {
      // Logging the failure itself failed (e.g. database unreachable). The lead is still saved.
      log.error('lead.notification_record_failed', { requestId: options.requestId, leadId: target.leadId, type: job.type, error });
    }
  }
}

function labelFor(type: NotificationEventType): string {
  return type === 'owner_new_lead' ? 'Owner notification email' : 'Acknowledgement email';
}
