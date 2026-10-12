import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { getServerConfig } from '../lib/server/config';
import { createSessionClient } from '../lib/supabase/clients';
import { leadStoreFrom } from '../lib/leads/service';
import { hashIdentifier } from '../lib/security/tokens';
import { log } from '../lib/server/logger';
import { safeAdminRedirect } from '../lib/auth/redirect';

/**
 * Admin sign-in / sign-out via Supabase Auth (email + password).
 *
 * - Errors are generic so the form does not reveal which accounts exist.
 * - Attempts are rate limited per hashed IP and per hashed email on top of
 *   Supabase's own limits.
 * - A valid Supabase login is not enough: the account must also have an
 *   active admin profile, otherwise the session is signed out immediately.
 */

export type AuthResult = { ok: true; redirect: string } | { ok: false; message: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

const GENERIC = 'Email or password is incorrect, or this account does not have admin access.';

export const auth = {
  login: defineAction({
    accept: 'form',
    handler: async (formData: FormData, context): Promise<AuthResult> => {
      const config = getServerConfig();
      if (!config.supabase) return { ok: false, message: 'Sign-in is unavailable: Supabase is not configured on this server.' };

      const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password'), next: formData.get('next') ?? undefined });
      if (!parsed.success) return { ok: false, message: 'Enter your email address and password.' };
      const { email, password, next } = parsed.data;

      // Rate limits (best effort: skipped if the secret key or APP_SECRET is not configured).
      const store = leadStoreFrom(config);
      if (store && config.appSecret) {
        let ip: string | null = null;
        try {
          ip = context.clientAddress;
        } catch {
          ip = context.request.headers.get('cf-connecting-ip');
        }
        const keys: [string, number, number][] = [[`login:email:${await hashIdentifier(config.appSecret, 'login', email)}`, 10, 3600]];
        if (ip) keys.push([`login:ip:${await hashIdentifier(config.appSecret, 'ip', ip)}`, 10, 900]);
        try {
          for (const [key, limit, window] of keys) {
            if (!(await store.checkRateLimit(key, limit, window))) {
              log.warn('auth.rate_limited', { requestId: context.locals.requestId, window });
              return { ok: false, message: 'Too many sign-in attempts. Please wait a few minutes and try again.' };
            }
          }
        } catch (error) {
          log.error('auth.rate_limit_unavailable', { requestId: context.locals.requestId, error });
        }
      }

      const client = createSessionClient(config.supabase, context.request, context.cookies);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        log.warn('auth.login_failed', { requestId: context.locals.requestId, code: error?.code ?? 'no_user' });
        return { ok: false, message: GENERIC };
      }

      const { data: profile } = await client.from('admin_profiles').select('id, is_active').eq('auth_user_id', data.user.id).maybeSingle();
      if (!profile || profile.is_active !== true) {
        await client.auth.signOut({ scope: 'local' });
        log.warn('auth.login_without_admin_profile', { requestId: context.locals.requestId, userId: data.user.id });
        return { ok: false, message: GENERIC };
      }

      log.info('auth.login', { requestId: context.locals.requestId, profileId: profile.id });
      return { ok: true, redirect: safeAdminRedirect(next) };
    },
  }),

  logout: defineAction({
    accept: 'form',
    handler: async (_formData: FormData, context): Promise<AuthResult> => {
      const config = getServerConfig();
      if (config.supabase) {
        const client = createSessionClient(config.supabase, context.request, context.cookies);
        await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
      log.info('auth.logout', { requestId: context.locals.requestId });
      return { ok: true, redirect: '/admin/login?signed_out=1' };
    },
  }),
};
