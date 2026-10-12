/**
 * Transactional email. Provider-agnostic interface with a Resend
 * implementation over plain fetch (no SDK, Workers-compatible).
 * SERVER-ONLY: holds the API key.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Prevents duplicate sends if a request is retried. */
  idempotencyKey: string;
}

export type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string; retryable: boolean };

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

export class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly apiKey: string;
  private readonly from: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, from: string, fetchImpl?: typeof fetch) {
    this.apiKey = apiKey;
    this.from = from;
    // Call fetch unbound: Cloudflare Workers throws "Illegal invocation" when
    // fetch runs with `this` set to another object (e.g. this.fetchImpl(...)).
    this.fetchImpl = (input, init) => (fetchImpl ?? fetch)(input, init);
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const response = await this.fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = (await response.json().catch(() => ({}))) as { id?: unknown };
        return { ok: true, messageId: typeof data.id === 'string' ? data.id : null };
      }
      // Provider error bodies are not echoed to visitors; keep a short summary for the admin.
      const detail = await response.text().catch(() => '');
      return {
        ok: false,
        error: `Resend ${response.status}: ${detail.slice(0, 300)}`,
        retryable: response.status === 429 || response.status >= 500,
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error', retryable: true };
    }
  }
}
