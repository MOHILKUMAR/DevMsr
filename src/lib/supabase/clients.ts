import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseConfig } from '../server/config';

/**
 * Supabase clients. SERVER-ONLY — never import from a client component.
 *
 * - publicClient: publishable key, no session. RLS limits it to published
 *   catalogue content. Used to render public pages.
 * - sessionClient: publishable key + the admin's auth cookies. Every admin
 *   query runs as that user, so RLS policies apply in the database as well
 *   as the server-side checks in middleware and actions.
 * - serviceClient: secret key, bypasses RLS. Used only by lead intake,
 *   rate limiting and notification logging (src/lib/leads), where the
 *   visitor is anonymous and must never be given direct table access.
 */

const NO_PERSIST = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

export function createPublicClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.publishableKey, { auth: NO_PERSIST });
}

export function createServiceClient(config: SupabaseConfig, secretKey: string): SupabaseClient {
  return createClient(config.url, secretKey, { auth: NO_PERSIST });
}

export function createSessionClient(
  config: SupabaseConfig,
  request: Request,
  cookies: AstroCookies,
  responseHeaders?: Headers,
): SupabaseClient {
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(cookiesToSet, cacheHeaders) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            ...options,
            path: options.path ?? '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
          });
        }
        // Keep CDNs from caching responses that set auth cookies.
        if (responseHeaders && cacheHeaders) {
          for (const [key, value] of Object.entries(cacheHeaders)) responseHeaders.set(key, String(value));
        }
      },
    },
  });
}
