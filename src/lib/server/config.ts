import { getSecret } from 'astro:env/server';

/**
 * Server-only runtime configuration.
 *
 * Values are read per call via getSecret() so they come from Cloudflare
 * secrets/vars at request time (or .dev.vars locally) and are never inlined
 * into a bundle. Never import this module from a client-side component.
 */

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export interface ServerConfig {
  supabase: SupabaseConfig | null;
  supabaseSecretKey: string | null;
  appSecret: string | null;
  email: {
    resendApiKey: string | null;
    from: string | null;
    ownerAddress: string | null;
    sendAcknowledgement: boolean;
  };
  turnstile: { siteKey: string; secretKey: string } | null;
  cronSecret: string | null;
}

function read(name: string): string | null {
  const value = getSecret(name)?.trim();
  return value ? value : null;
}

export function getServerConfig(): ServerConfig {
  const supabaseUrl = read('SUPABASE_URL');
  const publishableKey = read('SUPABASE_PUBLISHABLE_KEY');
  const turnstileSiteKey = read('TURNSTILE_SITE_KEY');
  const turnstileSecretKey = read('TURNSTILE_SECRET_KEY');
  const appSecret = read('APP_SECRET');

  return {
    supabase: supabaseUrl && publishableKey ? { url: supabaseUrl, publishableKey } : null,
    supabaseSecretKey: read('SUPABASE_SECRET_KEY'),
    // A short secret would make HMAC tokens guessable; treat it as missing.
    appSecret: appSecret && appSecret.length >= 32 ? appSecret : null,
    email: {
      resendApiKey: read('RESEND_API_KEY'),
      from: read('EMAIL_FROM'),
      ownerAddress: read('OWNER_NOTIFICATION_EMAIL'),
      sendAcknowledgement: read('SEND_LEAD_ACKNOWLEDGEMENT') === 'true',
    },
    turnstile: turnstileSiteKey && turnstileSecretKey ? { siteKey: turnstileSiteKey, secretKey: turnstileSecretKey } : null,
    cronSecret: read('CRON_SECRET'),
  };
}
