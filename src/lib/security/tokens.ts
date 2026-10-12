/**
 * HMAC helpers (WebCrypto — works in Workers and Node 22).
 *
 * - Form tokens: the page embeds "<issuedAt>.<hmac>" when it renders. On
 *   submit we check the signature and the age, which rejects most bots
 *   (they post instantly or replay stale pages) without any visible CAPTCHA.
 * - IP hashing: rate limits are keyed on HMAC(ip), so raw IP addresses are
 *   never stored.
 */

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueFormToken(secret: string, now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000).toString();
  return `${issuedAt}.${await hmacHex(secret, `form:${issuedAt}`)}`;
}

export type FormTokenCheck = { ok: true; ageSeconds: number } | { ok: false; reason: 'missing' | 'malformed' | 'bad_signature' | 'too_fast' | 'expired' };

export const FORM_TOKEN_MIN_AGE_SECONDS = 3;
export const FORM_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24;

export async function verifyFormToken(secret: string, token: string, now = Date.now()): Promise<FormTokenCheck> {
  if (!token) return { ok: false, reason: 'missing' };
  const match = /^(\d{9,11})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return { ok: false, reason: 'malformed' };
  const [, issuedAt = '', signature = ''] = match;
  const expected = await hmacHex(secret, `form:${issuedAt}`);
  if (!timingSafeEqual(signature, expected)) return { ok: false, reason: 'bad_signature' };
  const ageSeconds = Math.floor(now / 1000) - Number(issuedAt);
  if (ageSeconds < FORM_TOKEN_MIN_AGE_SECONDS) return { ok: false, reason: 'too_fast' };
  if (ageSeconds > FORM_TOKEN_MAX_AGE_SECONDS) return { ok: false, reason: 'expired' };
  return { ok: true, ageSeconds };
}

/** Stable, non-reversible identifier for rate limiting. */
export async function hashIdentifier(secret: string, kind: 'ip' | 'email' | 'login', value: string): Promise<string> {
  return (await hmacHex(secret, `${kind}:${value.trim().toLowerCase()}`)).slice(0, 32);
}
