# Implementation checklist

Legend: ✅ implemented and verified here · 🟡 implemented, needs verification with your live accounts · ⏳ deferred

## Phase 0 — Inspection
- ✅ Repository inspected (empty), GitHub remote noted, DNS inspected (no records), toolchain checked
- ✅ Hosting and adapter chosen: Cloudflare Workers + `@astrojs/cloudflare` 14

## Phase 1 — Foundation
- ✅ Astro 7, strict TypeScript, React islands, Tailwind 4, Lucide
- ✅ Light/dark design tokens with tested contrast; editorial typography; responsive header with accessible dropdowns and mobile menu
- ✅ Typed catalogue: 6 industries, 11 service categories, 125 services, 43 prices

## Phase 2 — Public website
- ✅ All routes in the brief's sitemap (33 public pages incl. dynamic routes) + 404
- ✅ Industry pages: problems, solution groups, services, integrations, pricing, products, process, FAQ, CTA
- ✅ Service pages: what/who/features/use cases/included/excluded/cost/timeline/dependencies/recurring costs/next steps
- ✅ Pricing explorer with search, industry, type, budget and billing filters (works without JavaScript via query string)
- ✅ Products with status labels; portfolio; blog with pagination; privacy and terms
- ✅ SEO: titles, descriptions, canonical URLs, Open Graph, JSON-LD (Organization, WebSite, Service + offers, FAQPage, BreadcrumbList, BlogPosting), live sitemap, robots.txt
- ✅ Social preview image (1200×630) and app icons, rendered from the brand mark and fonts (`scripts/generate-brand-images.mjs`)

## Phase 3 — Supabase and leads
- ✅ Migrations: schema, constraints, indexes, triggers, RLS, functions (`supabase/migrations`)
- ✅ Seed generated from the same typed data (`npm run seed:generate`)
- ✅ RLS and functions tested on PGlite with Supabase roles (`tests/db`)
- ✅ Lead pipeline: validation, honeypot, signed token, Turnstile, rate limits, idempotent save, reference numbers, notifications with failure logging (`tests/unit/lead-submit.test.ts`)
- ✅ Forms: accessible labels, inline errors + summary, loading, success and failure states; no-JS fallback
- ✅ Verified live on 12 Oct 2026: a lead saved through the form with its reference and activity, and the owner alert accepted by Resend (after fixing a Workers-only "Illegal invocation" bug in the Resend client)

## Phase 4 — Admin
- ✅ Sign-in/out, server-side session + admin profile checks, role capabilities, rate-limited login
- ✅ Dashboard metrics from live counts, recent leads, follow-ups due, notification problems with retry
- ✅ Lead inbox: search, status/industry/follow-up filters, pagination; lead detail: status, follow-up, notes, contact edits, activity history, source/UTM, owner-only delete
- ✅ Services (industries, features, visibility), pricing (all pricing models, exact amounts), industries, FAQs, products, portfolio, blog (Markdown preview), settings, audit log
- ✅ Unauthenticated access to admin pages and actions rejected (Playwright)
- ✅ Verified live on 12 Oct 2026: admin sign-in, non-admin refusal, dashboard counts, search, status/note/follow-up with actor in history, price edit visible on /pricing, audit log, sign-out

## Phase 5 — Quality and launch
- ✅ `astro check`: 0 errors · Vitest: unit + database tests passing · Playwright: public routes, navigation, forms, security headers, CSP, auth guards, no-JS, responsive, axe (light + dark)
- ✅ Secret scan of browser assets (`npm run check:secrets`)
- ✅ CI workflow; scheduled health ping + notification retry workflow — active since 12 Oct 2026 (Worker + GitHub `CRON_SECRET`, GitHub variable `SITE_URL`; manual run succeeded)
- ✅ Docs: setup, security/RLS, deployment/rollback, costs, decisions
- ✅ Preview deployment on `devmsr.mohil4280.workers.dev` (noindex); live checks 22/22 there before go-live
- ✅ Domain cut-over (approved and done 12 Oct 2026): live on https://devmsr.in; www and http redirect to it; read-only E2E 76/76 and live database checks 24/24 on the production domain

## Before launch (your actions)
- [x] Create Supabase project, run migrations + seed, create owner profile, disable sign-ups (docs/SETUP.md) — `npm run verify:supabase` passes 24/24
- [x] Verify Resend domain; set email variables
- [x] Create Turnstile widget — "devmsr.in lead forms" (Managed; devmsr.in, www.devmsr.in, the workers.dev preview); keys stored as Worker secrets; live check: widget loads, tokenless submissions are refused
- [x] Set Worker secrets; deploy to workers.dev; run the preview checklist (docs/DEPLOYMENT.md) — done 12 Oct 2026; live checks 22/22 on the preview
- [ ] Review all copy, especially service timelines, the seeded blog post, product concepts, privacy policy and terms
- [ ] Add contact email / phone / WhatsApp in `/admin/settings` (left empty rather than invented)
- [x] Approve and perform the domain cut-over
- [x] Turn on *Always Use HTTPS* for the zone; set Supabase Site URL to https://devmsr.in; submit the sitemap in Search Console — done 13 Oct 2026. Auth links use https://devmsr.in. The sitemap lists 39 URLs, all returning 200, indexable, with matching canonicals; `/admin` and `/api/` are disallowed in robots.txt

## Deferred (Phase 6 and later)
- ⏳ Quotation builder, package purchasing, Razorpay (server-side orders, signature + webhook verification, idempotency)
- ⏳ Invoices, client portal, project tracking, support tickets
- ⏳ n8n workflows, WhatsApp Business integration, AI chatbot / lead qualification, voice AI
- ⏳ Admin MFA, self-service password reset, image uploads to Supabase Storage (currently https URLs)
- ⏳ Edge caching of public pages (Astro 7 Cloudflare cache provider is experimental)
