/** Only same-site /admin paths are allowed as post-login destinations (no open redirects). */
export function safeAdminRedirect(next: string | undefined | null): string {
  if (!next) return '/admin';
  try {
    const url = new URL(next, 'https://devmsr.in');
    if (url.origin !== 'https://devmsr.in') return '/admin';
    if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return '/admin';
    if (url.pathname.startsWith('/admin/login')) return '/admin';
    // Never land on an action URL: a form submission must not be repeated by a redirect.
    if (url.searchParams.has('_action')) url.searchParams.delete('_action');
    return `${url.pathname}${url.search}`;
  } catch {
    return '/admin';
  }
}

/** Why a signed-out admin request was sent to the sign-in page. */
export type SignInReason = 'unsaved' | 'expired';

const SIGN_IN_REASONS: Record<SignInReason, string> = {
  unsaved: 'You were signed out, so your last change was not saved. Sign in, then make the change again.',
  expired: 'Your session has ended. Sign in again to continue.',
};

/** The sign-in page message for a `reason` query value; unknown values show nothing. */
export function signInReasonText(reason: string | null): string | null {
  return reason && Object.hasOwn(SIGN_IN_REASONS, reason) ? SIGN_IN_REASONS[reason as SignInReason] : null;
}

/**
 * The sign-in URL for an admin page request without a valid session.
 *
 * - `next` returns the admin to the same page, without the `_action`
 *   parameter, so nothing is re-submitted after sign-in.
 * - `reason=unsaved` for form submissions (the change was not applied),
 *   `reason=expired` when the browser sent a session that is no longer
 *   valid, and no reason for a plain visit while signed out.
 */
export function signInRedirect(url: URL, method: string, hadSession: boolean): string {
  const search = new URLSearchParams(url.search);
  search.delete('_action');
  const query = search.toString();
  const next = encodeURIComponent(`${url.pathname}${query ? `?${query}` : ''}`);
  const reason: SignInReason | null = method !== 'GET' && method !== 'HEAD' ? 'unsaved' : hadSession ? 'expired' : null;
  return `/admin/login?next=${next}${reason ? `&reason=${reason}` : ''}`;
}
