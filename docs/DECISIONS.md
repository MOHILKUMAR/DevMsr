# Technical decisions and deviations from the brief

## Versions

- **Astro 7.3** (current stable; released June 2026) with `@astrojs/cloudflare` 14. Astro 7 replaced the Go compiler with a Rust compiler and made Vite 8 the default — no impact on this project.
- **TypeScript 6.0**, not 7: `@astrojs/check` supports TypeScript up to 6.x.
- **Zod 4**, one shared copy with Astro.

## Architecture

| Decision | Why |
| --- | --- |
| `output: 'server'` on Cloudflare Workers; no prerendered pages | Catalogue pages read prices and services from the database so admin edits appear immediately. Static assets are still served free by Cloudflare without invoking the Worker. |
| One `get_public_catalogue()` RPC per request, memoised on `Astro.locals` | One round trip per page (industries, services, prices, products, FAQs, settings) keeps Worker CPU and latency low. |
| Bundled seed data as fallback | The site works without a database (local dev, CI) and keeps marketing pages up if Supabase is paused or down. Admin pages never use the fallback. Trade-off: during an outage the public site shows the last deployed seed, not the latest edits (logged). |
| Editorial copy in code (`src/data/industries.ts`, `service-categories.ts`); commercial data in the database | Problem statements and page structure are reviewed in Git; services, prices, statuses, products, FAQs and settings are edited in the dashboard. |
| Astro Actions for all forms (public and admin) | Server validation, typed results, and forms that work without JavaScript (HTML POST) as well as with it. |
| Admin pages are server-rendered HTML forms with POST → redirect → GET | Minimal client JavaScript in the admin; every mutation is a normal form post protected by the origin check. |
| No Astro sessions (`session: false`) | Supabase manages the admin session cookies; avoids provisioning Workers KV. |
| No `@astrojs/sitemap` | It only knows prerendered routes; `/sitemap.xml` is generated from live data instead. |
| No caching layer yet | Astro 7's Cloudflare cache provider is still experimental. Traffic at MVP scale fits free limits without it. Revisit if CPU or Supabase egress grows. |

## Database

| Decision | Why |
| --- | --- |
| New Supabase **publishable/secret keys** (`sb_publishable_`, `sb_secret_`) instead of anon/service_role | New projects no longer issue the legacy keys (Supabase announced removal by late 2026). |
| Secret key used only for lead intake, rate limits and notification logs | Visitors are anonymous and must not get any table access; everything else runs as the signed-in admin so RLS applies. |
| Money as `numeric(12,2)`, cast to text in JSON; decimal strings and BigInt paise in TypeScript | No floating point anywhere in the price path. |
| Extra columns on `service_pricing`: `label`, `display_group`, `max_open_ended`, `estimated_delivery`, `tax_inclusive`, `sort_order` | Needed to show the brief's price list exactly ("Hospital Management MVP", "₹25,000–₹1,00,000+", groups) and its pricing features (delivery range, GST flag). |
| `services.category` constrained to the 11 service pages; `status` = `offered` / `on_request` | Matches the sitemap; "on request" marks services such as EMR/EHR or voice AI that must be scoped carefully. |
| Extra tables: `faqs`, `audit_log`, `internal.rate_limits` | Editable FAQs, audit history for administrative changes, database-backed rate limiting without paid Redis. |
| Extra lead columns: `submission_id`, `form_type`, `service_category`, `source_path`, `content_fingerprint`, `last_activity_at` | Idempotency, duplicate detection, attribution and retention. |
| `text[]` for simple ordered lists (features, inclusions, stack, image URLs) | Plain string lists with length checks; normalising them into tables would add joins without benefit. |
| Activity history written by triggers | Status, follow-up and contact changes are logged with the acting admin even if a future code path forgets to. |
| Admin search through a SQL function | User input is a bound parameter, never part of a PostgREST filter string. |

## Security

- CSP is delivered as a header by Astro (hashes for every script/style it renders). Middleware merges `frame-ancestors 'none'` into it instead of replacing it. The one `is:inline` script (theme bootstrap) is hashed at build time from its source file.
- Spam: signed form-age token + honeypot + hashed IP/email rate limits by default; Turnstile is optional because it needs a Cloudflare widget and JavaScript.

## UI

- shadcn/ui is followed as a pattern (variant-based Button/Badge, accessible primitives) but implemented as Astro components and native elements rather than importing Radix, to keep JavaScript off content pages. React is used only where state is needed: the lead form and the catalogue/pricing explorer.
- Fonts: Newsreader (display serif) + Geist (body) + Geist Mono, self-hosted by Astro's Fonts API with metric-matched fallbacks.
- The brief's secondary text colour `#73776F` measures 4.25:1 on `#F7F7F4` (below WCAG AA for body text). It is kept for icons and decorative marks; text uses `#63675F` (5.2:1). The olive accent is darkened slightly (`#5F6749`) for text use. All pairs are checked by `tests/unit/contrast.test.ts` and axe in Playwright.

## Content honesty

- Products are seeded as **Concept**, except Lead Desk (**In development** — it runs this site's admin but is not yet packaged for clients).
- The only portfolio entry is this website, labelled as an internal project.
- Service-page timelines are phrased as "typical … confirmed in your quote"; per-price delivery estimates are left empty for you to fill in.
- One blog post ("What decides the cost of business software") is seeded as published. Review it, edit or unpublish it in `/admin/blog`.
- Legal pages describe the actual data flows but have not been reviewed by a lawyer. Review them before launch.
