# Deployment and rollback

Target: **Cloudflare Workers** (static assets + server rendering in one Worker), using the domain already on Cloudflare nameservers.

## Current state

- **Live since 12 Oct 2026** on `https://devmsr.in` (Worker `devmsr`). `www.devmsr.in` and plain-http requests redirect permanently to `https://devmsr.in` (in `src/middleware.ts`).
- The custom domains are declared in `wrangler.jsonc` (`routes`), so every `npm run deploy` keeps them.
- The `workers.dev` address and per-version preview URLs stay enabled for testing; pages there send `X-Robots-Tag: noindex`.
- Before go-live the domain had no website records, so there was no previous site to roll back to.

## One-time setup

1. **You:** `npx wrangler login` (opens a browser to authorise Wrangler for your Cloudflare account).
2. Deploy (the first deploy creates the Worker):
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

## Releases that add a migration

When a release adds a file to `supabase/migrations/`, run that file in the Supabase SQL Editor **before** `npm run deploy`. Migrations are written so the site that is already running keeps working with them (new columns have defaults, and the site ignores fields it does not know), and backfills only fill empty values, so they are safe to run more than once. Then deploy, and check the change on the live site.

Example: `20261013000004_pricing_detail.sql` adds “what can increase the price” to every price and fills in the scope and notes from the owner's Service Pricing Master.

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

## Domain cut-over (done 12 Oct 2026)

1. ✅ Custom domains `devmsr.in` and `www.devmsr.in` added through `routes` in `wrangler.jsonc`; Cloudflare created the DNS records and certificates.
2. ✅ `www` → apex and http → https redirects (301) handled by the middleware.
3. **You:** turn on *SSL/TLS → Edge Certificates → Always Use HTTPS* for the zone, so static files are also redirected to https (pages already are).
4. ✅ Turnstile widget "devmsr.in lead forms" covers devmsr.in, www.devmsr.in and the workers.dev preview (add any new hostname in *Turnstile → widget → Hostname management*). **You:** set Supabase *Authentication → URL Configuration → Site URL* to `https://devmsr.in`.
5. ✅ GitHub variable `SITE_URL=https://devmsr.in` and secret `CRON_SECRET` (same value as the Worker secret) are set; `scheduled.yml` runs daily at 09:00 IST.
6. Submit `https://devmsr.in/sitemap.xml` in Google Search Console.

No existing DNS record needs to be deleted.

## Rollback

| Situation | Action |
| --- | --- |
| Bad deploy | `npx wrangler rollback` (or dashboard → *Deployments* → roll back to a previous version). Instant. |
| Need to take the site offline | Remove the `routes` from `wrangler.jsonc` and deploy, or remove the custom domains in the dashboard. `devmsr.in` then serves nothing, as before go-live. |
| Bad migration | Migrations are additive; restore from your latest dump (see SECURITY → Backups). Test migrations on a second free project first. |

## Continuous deployment (optional)

Connect the GitHub repository in *Workers & Pages → devmsr → Settings → Builds* (Workers Builds: 3,000 free build minutes/month). Use build command `npm run build && npm run check:secrets` and deploy command `npx wrangler deploy --config dist/server/wrangler.json`. CI (`.github/workflows/ci.yml`) already type-checks, tests, builds and runs the E2E suite on every push.

## Operating notes

- **Supabase Free pauses after 7 days of low activity.** The daily `/api/health` call from `scheduled.yml` counts as activity. If the project does pause, public pages keep working from bundled data, but forms and admin stop until you click *Resume project* in Supabase.
- **The public catalogue is cached for 5 minutes in each Cloudflare data centre** (services, prices, industries, products, FAQs, settings). Saving anything in the admin clears it in the data centre that handled the save, so you see the change straight away; visitors elsewhere see it within 5 minutes. Leads, blog and portfolio are not cached.
- **Workers Free allows 10 ms CPU per request.** Pages here are light, but if you see `Error 1102`/CPU-limit errors in Workers logs, upgrade to Workers Paid (USD 5/month).
- Logs: *Workers & Pages → devmsr → Observability* (enabled in `wrangler.jsonc`). Search for `lead.save_failed`, `lead.notification_failed`, `catalogue.fallback`, `auth.rate_limited`, `catalogue.cache_read_failed` / `catalogue.cache_write_failed` (the cache was skipped; pages still load from the database), and `auth.session_rejected` (an admin was signed out because Supabase Auth rejected their session; `code` says why, e.g. `refresh_token_already_used`).
