/** Only same-site /admin paths are allowed as post-login destinations (no open redirects). */
export function safeAdminRedirect(next: string | undefined | null): string {
  if (!next) return '/admin';
  try {
    const url = new URL(next, 'https://devmsr.in');
    if (url.origin !== 'https://devmsr.in') return '/admin';
    if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return '/admin';
    if (url.pathname.startsWith('/admin/login')) return '/admin';
    return `${url.pathname}${url.search}`;
  } catch {
    return '/admin';
  }
}
