import type { APIRoute } from 'astro';
import { getServerConfig } from '../../lib/server/config';
import { createPublicClient } from '../../lib/supabase/clients';
import { log } from '../../lib/server/logger';

/**
 * GET /api/health — liveness and database reachability for uptime checks.
 *
 * Reveals only coarse status. Calling it daily also counts as database
 * activity, which keeps a Supabase Free project from being paused for
 * inactivity (see docs/DEPLOYMENT.md).
 */
export const GET: APIRoute = async ({ locals }) => {
  const config = getServerConfig();
  let database: 'ok' | 'unconfigured' | 'error' = 'unconfigured';

  if (config.supabase) {
    try {
      const { error } = await createPublicClient(config.supabase).from('industries').select('id', { head: true, count: 'exact' }).limit(1);
      database = error ? 'error' : 'ok';
      if (error) log.error('health.database_error', { requestId: locals.requestId, code: error.code });
    } catch (error) {
      database = 'error';
      log.error('health.database_unreachable', { requestId: locals.requestId, error });
    }
  }

  const healthy = database !== 'error';
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', database, time: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
};
