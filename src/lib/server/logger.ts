/**
 * Structured JSON logging for Workers Logs.
 *
 * Keys that commonly carry personal data are redacted, so a log line can
 * never leak a visitor's name, email, phone or message. Log identifiers
 * (lead id, reference, request id) instead of content.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const REDACTED_KEYS = new Set([
  'name',
  'email',
  'phone',
  'message',
  'project_description',
  'projectDescription',
  'business_name',
  'businessName',
  'password',
  'token',
  'authorization',
  'cookie',
  'ip',
  'website_url',
  'websiteUrl',
]);

function sanitise(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth]';
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitise(item, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = REDACTED_KEYS.has(key) ? '[redacted]' : sanitise(inner, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function emit(level: Level, event: string, fields: Fields = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...(sanitise(fields) as Fields) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields?: Fields) => emit('debug', event, fields),
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),
};

export { sanitise as sanitiseLogFields };
