import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getServerConfig } from '../server/config';
import { createSessionClient } from '../supabase/clients';
import { log } from '../server/logger';
import { ADMIN_ROLES, type AdminContext } from './types';

const profileSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
  role: z.enum(ADMIN_ROLES),
  is_active: z.boolean(),
});

export interface ResolvedAdmin {
  admin: AdminContext | null;
  client: SupabaseClient | null;
}

/**
 * Verifies the Supabase session from cookies and loads the admin profile.
 *
 * - getClaims() verifies the JWT signature (locally with asymmetric keys,
 *   or via the Auth server) and refreshes near-expiry sessions.
 * - The role comes only from `admin_profiles`, which visitors cannot write;
 *   nothing in the token or request can grant admin access by itself.
 */
export async function resolveAdmin(request: Request, cookies: AstroCookies, requestId: string): Promise<ResolvedAdmin> {
  const config = getServerConfig();
  if (!config.supabase) return { admin: null, client: null };

  const client = createSessionClient(config.supabase, request, cookies);
  try {
    const { data: claimsData, error: claimsError } = await client.auth.getClaims();
    const claims = claimsData?.claims;
    if (claimsError || !claims?.sub) return { admin: null, client };

    const { data: profile, error: profileError } = await client
      .from('admin_profiles')
      .select('id, display_name, role, is_active')
      .eq('auth_user_id', claims.sub)
      .maybeSingle();
    if (profileError) {
      log.error('auth.profile_lookup_failed', { requestId, code: profileError.code });
      return { admin: null, client };
    }
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success || !parsed.data.is_active) {
      if (profile) log.warn('auth.inactive_or_invalid_profile', { requestId, userId: claims.sub });
      return { admin: null, client };
    }
    return {
      client,
      admin: {
        userId: claims.sub,
        profileId: parsed.data.id,
        email: typeof claims.email === 'string' ? claims.email : null,
        displayName: parsed.data.display_name,
        role: parsed.data.role,
      },
    };
  } catch (error) {
    log.error('auth.resolve_failed', { requestId, error });
    return { admin: null, client };
  }
}
