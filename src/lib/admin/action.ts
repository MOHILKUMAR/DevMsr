import { ActionError, defineAction, type ActionAPIContext } from 'astro:actions';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { can, type AdminContext, type Capability } from '../auth/types';
import { log } from '../server/logger';
import { formToObject } from './form';
import { invalidatePublicCache } from '../catalogue/repository';

/**
 * Wrapper for every admin mutation. In order:
 *   1. Authenticate — middleware verified the session; we re-check here.
 *   2. Authorise — the admin's role must grant the capability.
 *   3. Validate — the form is parsed with an explicit Zod schema.
 *   4. Execute — via the admin's own Supabase session, so RLS also applies.
 *   5. Return a typed result; database errors become safe messages.
 *   6. After a successful change to anything public (all but leads), clear
 *      the cached public data so the website picks it up.
 */

export type AdminResult =
  | { ok: true; message: string; id?: string; notice?: 'saved' | 'created' | 'deleted' | 'status' | 'note' | 'followup' | 'contact' | 'sent' | 'shown' | 'hidden' }
  | { ok: false; message: string; fieldErrors?: Record<string, string>; values?: Record<string, unknown> };

export interface AdminHandlerContext {
  admin: AdminContext;
  db: SupabaseClient;
  action: ActionAPIContext;
}

export function defineAdminAction<S extends z.ZodType>(options: {
  capability: Capability;
  schema: S;
  arrays?: readonly string[];
  handler: (input: z.output<S>, ctx: AdminHandlerContext) => Promise<AdminResult>;
}) {
  return defineAction({
    accept: 'form',
    handler: async (formData: FormData, context): Promise<AdminResult> => {
      const admin = context.locals.admin;
      const db = context.locals.adminClient;
      if (!admin || !db) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Please sign in again.' });
      if (!can(admin, options.capability)) throw new ActionError({ code: 'FORBIDDEN', message: 'Your role does not allow this action.' });

      const raw = formToObject(formData, options.arrays);
      const parsed = options.schema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
        return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values: raw };
      }

      try {
        const result = await options.handler(parsed.data, { admin, db, action: context });
        if (result.ok && options.capability !== 'leads') await invalidatePublicCache();
        return result;
      } catch (error) {
        log.error('admin.action_failed', { requestId: context.locals.requestId, actor: admin.profileId, error });
        return { ok: false, message: describeDatabaseError(error), values: raw };
      }
    },
  });
}

/** Throws with the Supabase error so the wrapper can translate it. */
export function check<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
  return result.data;
}

export function describeDatabaseError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case '23505':
      return 'That value is already in use (for example, the slug). Choose a different one.';
    case '23514':
      return 'One of the values is not allowed. Check amounts, URLs and lengths.';
    case '23503':
      return 'This record is linked to something that no longer exists. Reload and try again.';
    case '42501':
      return 'You do not have permission to change this.';
    case 'PGRST116':
      return 'Record not found. It may have been deleted.';
    default:
      return 'Could not save. Please try again.';
  }
}
