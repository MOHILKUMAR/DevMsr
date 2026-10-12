import type { APIRoute } from 'astro';
import { getServerConfig } from '../../../lib/server/config';
import { createServiceClient } from '../../../lib/supabase/clients';
import { leadStoreFrom, notificationSettingsFrom } from '../../../lib/leads/service';
import { retryPendingNotifications } from '../../../lib/leads/retry';
import { log } from '../../../lib/server/logger';

/**
 * POST /api/cron/retry-notifications
 * Authorization: Bearer <CRON_SECRET>
 *
 * Retries failed lead notification emails. Intended to be called by a
 * scheduler (see .github/workflows/scheduled.yml). Responds with counts only.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  const config = getServerConfig();
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!config.cronSecret || config.cronSecret.length < 24 || !timingSafeEqual(provided, config.cronSecret)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const store = leadStoreFrom(config);
  if (!store || !config.supabase || !config.supabaseSecretKey) return Response.json({ error: 'not_configured' }, { status: 503 });

  try {
    const result = await retryPendingNotifications(createServiceClient(config.supabase, config.supabaseSecretKey), store, notificationSettingsFrom(config), {
      origin: url.origin,
      requestId: locals.requestId,
    });
    log.info('cron.retry_notifications', { requestId: locals.requestId, ...result });
    return Response.json(result);
  } catch (error) {
    log.error('cron.retry_notifications_failed', { requestId: locals.requestId, error });
    return Response.json({ error: 'failed' }, { status: 500 });
  }
};

export const GET: APIRoute = () => Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
