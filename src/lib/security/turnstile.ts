/**
 * Cloudflare Turnstile server-side verification.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Tokens are single-use and expire after 300 seconds. The widget alone is
 * not protection — only this server-side check is.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  errorCodes: string[];
}

export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string | null,
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (!token) return { success: false, errorCodes: ['missing-input-response'] };
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);
  body.append('idempotency_key', idempotencyKey);

  try {
    const response = await fetchImpl(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { success: false, errorCodes: [`http-${response.status}`] };
    const data = (await response.json()) as { success?: unknown; 'error-codes'?: unknown };
    return {
      success: data.success === true,
      errorCodes: Array.isArray(data['error-codes']) ? data['error-codes'].filter((code): code is string => typeof code === 'string') : [],
    };
  } catch (error) {
    return { success: false, errorCodes: [error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network-error'] };
  }
}
