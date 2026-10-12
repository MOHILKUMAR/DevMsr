/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Correlation id for logs and the x-request-id response header. */
    requestId: string;
    /** Set by middleware on /admin routes once the session and admin profile are verified. */
    admin: import('./lib/auth/types').AdminContext | null;
    /** Session-scoped Supabase client (RLS applies as the signed-in admin). */
    adminClient: import('@supabase/supabase-js').SupabaseClient | null;
    /** Per-request memo for the public catalogue query. */
    cataloguePromise?: Promise<import('./types/catalogue').Catalogue>;
  }
}
