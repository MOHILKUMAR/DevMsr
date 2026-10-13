# DevMsr.in

Agency website and lead-management platform for **DevMsr.in** — websites, custom business software and AI automation for hospitals, hotels, restaurants, retailers, travel companies and schools.

- **Public site:** industry and service catalogue (6 industries, 11 service categories, 125 services), indicative pricing in INR (43 prices), products with honest status labels, portfolio, blog, legal pages, sitemap.
- **Lead intake:** contact, quote and demo forms with server-side validation, spam defences, rate limiting and email notifications. A lead is always saved before any email is attempted.
- **Lead Desk (admin):** secure sign-in, live dashboard, lead inbox with search/filters/pagination, lead detail with status, notes, follow-ups and activity history, and editors for services, pricing, industries, FAQs, products, portfolio, blog and settings.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Astro 7 (server output), TypeScript strict, React 19 islands |
| Styling | Tailwind CSS 4, semantic design tokens (light + dark), Lucide icons |
| Validation | Zod 4 (shared client/server schemas), React Hook Form on public forms |
| Data/auth | Supabase PostgreSQL + Auth, Row Level Security |
| Hosting | Cloudflare Workers via `@astrojs/cloudflare` 14 |
| Email | Resend (REST API, no SDK) |
| Spam | Signed form-age token, honeypot, hashed-IP/email rate limits, optional Cloudflare Turnstile |
| Tests | Vitest (unit + PGlite-backed SQL/RLS tests), Playwright + axe-core (E2E, accessibility) |

## Quick start

```bash
npm install
cp .env.example .dev.vars   # then edit; leave Supabase empty to use bundled data
npm run dev                 # http://localhost:4321
```

Without Supabase configured the public site runs from the bundled seed data in `src/data/`, and lead forms honestly report that they are unavailable. See **[docs/SETUP.md](docs/SETUP.md)** to connect Supabase, Resend and Turnstile and create the first admin.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on workerd (Cloudflare runtime) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally on workerd |
| `npm run check` | `astro check` — TypeScript and template type checking |
| `npm test` | Unit tests and database tests (migrations + RLS on PGlite) |
| `npm run test:e2e` | Playwright end-to-end and accessibility tests (needs a build). Read-only when `.dev.vars` has real Supabase keys |
| `npm run seed:generate` | Regenerate `supabase/seed.sql` from `src/data/` |
| `npm run check:secrets` | Scan browser assets for secrets; remove copied `.dev.vars` |
| `npm run verify:supabase` | Read-only checks of a live Supabase project (schema, seed, RLS) |
| `npm run deploy:preview` | Build, scan, upload a preview version to Cloudflare |
| `npm run deploy` | Build, scan, deploy to Cloudflare |

## Project layout

```text
src/
  actions/          Astro Actions: lead submission, auth, admin mutations
  components/       layout, ui, forms (LeadForm island), services (explorer island),
                    industries, previews (labelled sample-data illustrations), admin
  data/             Editorial copy (industries, service categories) + seed data
  layouts/          Base, Marketing, Legal, Admin
  lib/
    admin/          Guarded admin action wrapper, form parsing, admin reads
    auth/           Session resolution, roles/capabilities, safe redirects
    catalogue/      Repository (Supabase RPC + bundled fallback), selectors, pricing
    content/        Safe Markdown renderer
    email/          Provider interface (Resend) and escaped templates
    leads/          Intake pipeline, notifications, retry, Supabase store
    security/       Headers/CSP merge, HMAC tokens, Turnstile
    server/         Runtime config (secrets) and structured logger
  middleware.ts     Request ids, admin session guard, security headers
  pages/            File-based routes (public, admin, api)
  schemas/          Zod schemas for lead and admin forms
supabase/
  migrations/       Schema, RLS policies, admin functions
  seed.sql          Generated — do not edit by hand
tests/              unit/, db/ (PGlite), e2e/ (Playwright)
docs/               Setup, security, deployment, costs, decisions, checklist
```

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — Supabase, admin account, Resend, Turnstile, environment variables
- [docs/SECURITY.md](docs/SECURITY.md) — security model, RLS matrix, secrets, retention, backups
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Cloudflare Workers deployment, domain cut-over, rollback
- [docs/COSTS.md](docs/COSTS.md) — free-tier limits and expected recurring costs
- [docs/DECISIONS.md](docs/DECISIONS.md) — technical decisions and deviations from the brief
- [docs/CHECKLIST.md](docs/CHECKLIST.md) — implemented, pending verification and deferred features

## Content rules

The site must not invent testimonials, client logos, metrics, case studies or finished products. The code enforces part of this: products cannot be marked **Available** without an explicit confirmation, client portfolio entries cannot be published without confirming the client's permission, interface illustrations are labelled “Sample data”, and structured data never includes ratings or reviews.
