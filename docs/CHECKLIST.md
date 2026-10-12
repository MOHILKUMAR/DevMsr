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
- 🟡 Saving a real lead in your Supabase project and receiving the Resend email

## Phase 4 — Admin
- ✅ Sign-in/out, server-side session + admin profile checks, role capabilities, rate-limited login
- ✅ Dashboard metrics from live counts, recent leads, follow-ups due, notification problems with retry
- ✅ Lead inbox: search, status/industry/follow-up filters, pagination; lead detail: status, follow-up, notes, contact edits, activity history, source/UTM, owner-only delete
- ✅ Services (industries, features, visibility), pricing (all pricing models, exact amounts), industries, FAQs, products, portfolio, blog (Markdown preview), settings, audit log
- ✅ Unauthenticated access to admin pages and actions rejected (Playwright)
- 🟡 Admin flows against your live Supabase project (sign-in, edits appearing on the public site)

## Phase 5 — Quality and launch
- ✅ `astro check`: 0 errors · Vitest: unit + database tests passing · Playwright: public routes, navigation, forms, security headers, CSP, auth guards, no-JS, responsive, axe (light + dark)
- ✅ Secret scan of browser assets (`npm run check:secrets`)
- ✅ CI workflow; scheduled health ping + notification retry workflow
- ✅ Docs: setup, security/RLS, deployment/rollback, costs, decisions
- 🟡 Preview deployment on `*.workers.dev` (needs `wrangler login`)
- ⏳ Domain cut-over — only after your approval

## Before launch (your actions)
- [ ] Create Supabase project, run migrations + seed, create owner profile, disable sign-ups (docs/SETUP.md)
- [ ] Verify Resend domain; set email variables
- [ ] Create Turnstile widget (recommended)
- [ ] Set Worker secrets; deploy to workers.dev; run the preview checklist (docs/DEPLOYMENT.md)
- [ ] Review all copy, especially service timelines, the seeded blog post, product concepts, privacy policy and terms
- [ ] Add contact email / phone / WhatsApp in `/admin/settings` (left empty rather than invented)
- [ ] Approve and perform the domain cut-over

## Deferred (Phase 6 and later)
- ⏳ Quotation builder, package purchasing, Razorpay (server-side orders, signature + webhook verification, idempotency)
- ⏳ Invoices, client portal, project tracking, support tickets
- ⏳ n8n workflows, WhatsApp Business integration, AI chatbot / lead qualification, voice AI
- ⏳ Admin MFA, self-service password reset, image uploads to Supabase Storage (currently https URLs)
- ⏳ Edge caching of public pages (Astro 7 Cloudflare cache provider is experimental)
