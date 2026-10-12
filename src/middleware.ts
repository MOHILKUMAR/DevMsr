import { defineMiddleware } from 'astro:middleware';
import { getActionContext } from 'astro:actions';
import { resolveAdmin } from './lib/auth/session';
import { securityHeadersFor, withHeaders } from './lib/security/headers';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** Pages that embed a per-render form token and idempotency key must never be cached. */
const NO_STORE_PATHS = new Set(['/contact', '/request-quote', '/book-a-demo']);

/**
 * 1. Assigns a request id for log correlation.
 * 2. For /admin pages, admin actions and /api/admin endpoints: verifies the
 *    Supabase session and admin profile on the server. Unauthenticated page
 *    requests are redirected to /admin/login. Actions and endpoints also
 *    check `locals.admin` themselves (defence in depth).
 * 3. Adds security headers; private pages are marked no-store / noindex.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = context.request.headers.get('cf-ray') ?? crypto.randomUUID();
  context.locals.admin = null;
  context.locals.adminClient = null;

  if (context.isPrerendered) return next();

  const { pathname } = context.url;
  const { action } = getActionContext(context);
  const adminPage = isAdminPath(pathname);
  const adminRequest = adminPage || pathname.startsWith('/api/admin/') || action?.name.startsWith('admin.') === true;

  if (adminRequest) {
    const { admin, client } = await resolveAdmin(context.request, context.cookies, context.locals.requestId);
    context.locals.admin = admin;
    context.locals.adminClient = admin ? client : null;

    const isLogin = pathname === '/admin/login';
    if (adminPage && !admin && !isLogin) {
      const nextPath = encodeURIComponent(pathname + context.url.search);
      return withHeaders(context.redirect(`/admin/login?next=${nextPath}`, 303), securityHeadersFor({ private: true, https: context.url.protocol === 'https:', requestId: context.locals.requestId }));
    }
    if (adminPage && admin && isLogin && context.request.method === 'GET') {
      return withHeaders(context.redirect('/admin', 303), securityHeadersFor({ private: true, https: context.url.protocol === 'https:', requestId: context.locals.requestId }));
    }
  }

  const response = await next();
  const headers = securityHeadersFor({
    private: adminRequest || pathname.startsWith('/api/'),
    https: context.url.protocol === 'https:',
    requestId: context.locals.requestId,
  });
  if (NO_STORE_PATHS.has(pathname) || pathname.startsWith('/_actions/')) headers['Cache-Control'] = 'private, no-store';
  return withHeaders(response, headers);
});
