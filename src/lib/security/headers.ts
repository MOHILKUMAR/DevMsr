/**
 * Security headers for responses rendered by the Worker.
 * Static assets get equivalent headers from public/_headers.
 *
 * The Content-Security-Policy with script/style hashes is emitted by Astro
 * (security.csp in astro.config.mjs) as a <meta> tag. Directives that only
 * work as headers, such as frame-ancestors, are sent here.
 */
export const BASE_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
};

export const HSTS_HEADER = 'max-age=31536000; includeSubDomains';

/**
 * Preview deployments (the Worker's *.workers.dev address) must not be
 * indexed: the real site is devmsr.in and duplicates would compete with it.
 */
export function isPreviewHost(hostname: string): boolean {
  return hostname.endsWith('.workers.dev');
}

export interface HeaderOptions {
  /** Private pages: never cache, never index. */
  private: boolean;
  https: boolean;
  requestId: string;
  /** Keep search engines out (e.g. preview hosts) without changing caching. */
  noindex?: boolean;
}

export function securityHeadersFor(options: HeaderOptions): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_SECURITY_HEADERS, 'X-Request-Id': options.requestId };
  if (options.https) headers['Strict-Transport-Security'] = HSTS_HEADER;
  if (options.private) headers['Cache-Control'] = 'private, no-store';
  if (options.private || options.noindex) headers['X-Robots-Tag'] = 'noindex, nofollow';
  return headers;
}

/**
 * Combines Astro's generated CSP (script/style hashes) with header-only
 * directives. Never replaces Astro's policy: that would drop the hashes.
 */
export function mergeCsp(existing: string | null, extra: string): string {
  if (!existing) return extra;
  const present = new Set(existing.split(';').map((part) => part.trim().split(/\s+/)[0]?.toLowerCase()));
  const additions = extra
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !present.has(part.split(/\s+/)[0]!.toLowerCase()));
  return additions.length ? `${existing.replace(/;\s*$/, '')}; ${additions.join('; ')}` : existing;
}

function apply(target: Headers, headers: Record<string, string>) {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-security-policy') target.set(key, mergeCsp(target.get(key), value));
    else target.set(key, value);
  }
}

/** Applies headers, cloning the response if its headers are immutable (e.g. Response.redirect). */
export function withHeaders(response: Response, headers: Record<string, string>): Response {
  try {
    apply(response.headers, headers);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    apply(copy.headers, headers);
    return copy;
  }
}
