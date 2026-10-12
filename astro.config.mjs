// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// The pre-paint theme script is inlined (is:inline), which Astro does not hash.
// Hash it here from the same file the layout inlines, so the CSP stays in sync.
const themeInit = readFileSync(new URL('./src/scripts/theme-init.js', import.meta.url), 'utf8');
const themeInitHash = `sha256-${createHash('sha256').update(themeInit).digest('base64')}`;

// Server-side configuration is read at runtime (Cloudflare secrets / vars,
// or .dev.vars locally). Every variable is `access: 'secret'` so values are
// never inlined into any bundle, and all are optional so the site can run in
// a degraded "no database" mode during local development.
const serverSecret = (/** @type {string} */ _description) =>
  envField.string({ context: 'server', access: 'secret', optional: true });

export default defineConfig({
  site: 'https://devmsr.in',
  output: 'server',
  trailingSlash: 'never',
  adapter: cloudflare({
    // SVG illustrations only; no runtime image transformation needed.
    imageService: 'passthrough',
  }),
  // Admin auth uses Supabase cookies; Astro sessions (KV) are not needed.
  session: false,
  // Advanced routing (src/fetch.ts) is not used.
  fetchFile: null,
  integrations: [react()],
  // Blog Markdown is rendered by src/lib/content/markdown.ts; Astro's
  // Shiki highlighter (inline styles) would conflict with the CSP.
  markdown: { syntaxHighlight: false },
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: ['400 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist',
      cssVariable: '--font-geist',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  env: {
    schema: {
      SUPABASE_URL: serverSecret('Supabase project URL'),
      SUPABASE_PUBLISHABLE_KEY: serverSecret('sb_publishable_… key (server use only)'),
      SUPABASE_SECRET_KEY: serverSecret('sb_secret_… key, used only for lead intake'),
      APP_SECRET: serverSecret('32+ random characters for HMAC form tokens and IP hashing'),
      RESEND_API_KEY: serverSecret('Resend API key'),
      EMAIL_FROM: serverSecret('Verified sender, e.g. "DevMsr.in <notify@devmsr.in>"'),
      OWNER_NOTIFICATION_EMAIL: serverSecret('Inbox that receives new lead alerts'),
      SEND_LEAD_ACKNOWLEDGEMENT: serverSecret('"true" to email prospects a receipt'),
      TURNSTILE_SITE_KEY: serverSecret('Cloudflare Turnstile site key'),
      TURNSTILE_SECRET_KEY: serverSecret('Cloudflare Turnstile secret key'),
      CRON_SECRET: serverSecret('Bearer token for the notification retry endpoint'),
    },
  },
  security: {
    checkOrigin: true,
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' https: data:",
        "font-src 'self'",
        "connect-src 'self' https://challenges.cloudflare.com",
        'frame-src https://challenges.cloudflare.com',
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "manifest-src 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
        hashes: [/** @type {`sha256-${string}`} */ (themeInitHash)],
      },
    },
  },
});
