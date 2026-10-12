# Deployment and rollback

Target: **Cloudflare Workers** (static assets + server rendering in one Worker), using the domain already on Cloudflare nameservers.

## Current state (inspected 12 Oct 2026)

- `devmsr.in` uses Cloudflare nameservers (`fay`, `gabriel`) but has **no A, AAAA, CNAME, MX or TXT records** — nothing is live, and nothing can be overwritten by a deployment.
- The GitHub repository `MOHILKUMAR/DevMsr` was empty; this work is on branch `feat/astro-platform` (not pushed).
- No previous website exists, so "rollback" before cut-over simply means not attaching the domain.

## One-time setup

1. **You:** `npx wrangler login` (opens a browser to authorise Wrangler for your Cloudflare account).
2. Create the Worker on its `*.workers.dev` address only — `wrangler.jsonc` deliberately has no routes, so this does **not** touch `devmsr.in`:
   ```bash
   npm run deploy
   ```
3. **You:** add secrets (each command prompts for the value; nothing is stored in the repo):
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
   npx wrangler secret put SUPABASE_SECRET_KEY
   npx wrangler secret put APP_SECRET
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put EMAIL_FROM
   npx wrangler secret put OWNER_NOTIFICATION_EMAIL
   npx wrangler secret put TURNSTILE_SITE_KEY
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put CRON_SECRET
   ```
   `SEND_LEAD_ACKNOWLEDGEMENT` is a plain variable in `wrangler.jsonc`.
4. Redeploy (`npm run deploy`) so the new secrets are used.

## Preview → verify → approve

1. `npm run deploy:preview` uploads a new version without routing traffic to it and prints a preview URL.
2. On the preview (or the `workers.dev` URL), check:
   - [ ] `/api/health` returns `{"status":"ok","database":"ok"}`
   - [ ] every page in the sitemap loads; mobile menu works
   - [ ] a quote request saves and shows a `DM-…` reference; the owner email arrives
   - [ ] the lead appears in `/admin/leads`; status, note and follow-up changes appear in its history
   - [ ] a price edited in `/admin/pricing` appears on `/pricing`
   - [ ] signed out, `/admin` redirects to sign-in; a non-admin Supabase user cannot sign in
   - [ ] `E2E_BASE_URL=https://<preview-url> E2E_READ_ONLY=1 npm run test:e2e` passes. `E2E_READ_ONLY=1` skips the tests that could save a real lead and email you; without it, a live database collects test leads
3. **You approve** the cut-over.

## Domain cut-over (after approval)

1. **You:** Cloudflare dashboard → *Workers & Pages → devmsr → Settings → Domains & Routes → Add → Custom domain*: `devmsr.in`, then again for `www.devmsr.in`. Cloudflare creates the DNS records and certificates. (Equivalent: uncomment `routes` in `wrangler.jsonc` and deploy.)
2. **You:** add a Redirect Rule (*Rules → Redirect Rules*): `www.devmsr.in/*` → `https://devmsr.in/${1}`, 301.
3. Update Turnstile hostnames and set Supabase *Authentication → URL Configuration → Site URL* to `https://devmsr.in`.
4. In GitHub, set variable `SITE_URL=https://devmsr.in` and secret `CRON_SECRET` to enable the daily health ping and notification retries.
5. Submit `https://devmsr.in/sitemap.xml` in Google Search Console.

No existing DNS record needs to be deleted.

## Rollback

| Situation | Action |
| --- | --- |
| Bad deploy | `npx wrangler rollback` (or dashboard → *Deployments* → roll back to a previous version). Instant. |
| Need to take the site offline | Remove the custom domains from the Worker. `devmsr.in` returns to its current (empty) state. |
| Bad migration | Migrations are additive; restore from your latest dump (see SECURITY → Backups). Test migrations on a second free project first. |

## Continuous deployment (optional)

Connect the GitHub repository in *Workers & Pages → devmsr → Settings → Builds* (Workers Builds: 3,000 free build minutes/month). Use build command `npm run build && npm run check:secrets` and deploy command `npx wrangler deploy --config dist/server/wrangler.json`. CI (`.github/workflows/ci.yml`) already type-checks, tests, builds and runs the E2E suite on every push.

## Operating notes

- **Supabase Free pauses after 7 days of low activity.** The daily `/api/health` call from `scheduled.yml` counts as activity. If the project does pause, public pages keep working from bundled data, but forms and admin stop until you click *Resume project* in Supabase.
- **Workers Free allows 10 ms CPU per request.** Pages here are light, but if you see `Error 1102`/CPU-limit errors in Workers logs, upgrade to Workers Paid (USD 5/month).
- Logs: *Workers & Pages → devmsr → Observability* (enabled in `wrangler.jsonc`). Search for `lead.save_failed`, `lead.notification_failed`, `catalogue.fallback`, `auth.rate_limited`.
