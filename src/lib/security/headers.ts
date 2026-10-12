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

export interface HeaderOptions {
  /** Private pages: never cache, never index. */
  private: boolean;
  https: boolean;
  requestId: string;
}

export function securityHeadersFor(options: HeaderOptions): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_SECURITY_HEADERS, 'X-Request-Id': options.requestId };
  if (options.https) headers['Strict-Transport-Security'] = HSTS_HEADER;
  if (options.private) {
    headers['Cache-Control'] = 'private, no-store';
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }
  return headers;
}

/** Applies headers, cloning the response if its headers are immutable (e.g. Response.redirect). */
export function withHeaders(response: Response, headers: Record<string, string>): Response {
  try {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers)) copy.headers.set(key, value);
    return copy;
  }
}
