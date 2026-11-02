/**
 * Links that open a lead form with some choices already filled in.
 *
 * On the site the choices go after "#" (/request-quote#industry=healthcare)
 * rather than "?". A fragment never reaches the server, so crawlers see one
 * URL per form instead of one per industry, service or product. LeadForm
 * reads the fragment in the browser. "?" links (from emails, ads or old
 * bookmarks) still work: LeadFormSection reads the query on the server, and
 * both paths resolve choices with resolvePrefill() below.
 */

export type FormPath = '/request-quote' | '/book-a-demo';

export const PREFILL_KEYS = ['industry', 'category', 'service', 'product'] as const;
export type PrefillKey = (typeof PREFILL_KEYS)[number];
export type Prefill = Partial<Record<PrefillKey, string>>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function formLink(path: FormPath, prefill: Prefill = {}): string {
  const params = new URLSearchParams();
  for (const key of PREFILL_KEYS) {
    const value = prefill[key];
    if (value) params.set(key, value);
  }
  const fragment = params.toString();
  return fragment ? `${path}#${fragment}` : path;
}

/** Reads choices from "#industry=…&service=…" or "?industry=…"; anything that is not a slug is dropped. */
export function readPrefill(source: string): Prefill {
  const params = new URLSearchParams(source.replace(/^[#?]/, ''));
  const prefill: Prefill = {};
  for (const key of PREFILL_KEYS) {
    const value = params.get(key)?.trim();
    if (value && value.length <= 80 && SLUG.test(value)) prefill[key] = value;
  }
  return prefill;
}

/** Rewrites a "/request-quote?…" or "/book-a-demo?…" link written in admin content to the "#" form. */
export function toFormLink(href: string): string {
  const match = /^(https:\/\/devmsr\.in)?\/(request-quote|book-a-demo)\?([^#]*)$/.exec(href.trim());
  if (!match) return href;
  return `${match[1] ?? ''}${formLink(`/${match[2]}` as FormPath, readPrefill(match[3] ?? ''))}`;
}

/** What a form needs to turn slugs into choices. `industry` on a service is set only when it serves exactly one. */
export interface PrefillOptions {
  industries: string[];
  categories: string[];
  services?: { slug: string; name: string; industry: string | null }[];
  products?: { slug: string; name: string; industry: string | null; category: string | null }[];
}

export interface ResolvedPrefill {
  industry: string;
  interest: string;
  /** Extra "Selected service" option when a specific service was asked for (LeadForm adds it). */
  service: { value: string; label: string } | null;
  productName: string | null;
}

export function resolvePrefill(prefill: Prefill, options: PrefillOptions): ResolvedPrefill {
  const service = options.services?.find((item) => item.slug === prefill.service) ?? null;
  const product = options.products?.find((item) => item.slug === prefill.product) ?? null;
  // Only values the form has an option for: any other would leave the select blank while counting as filled in.
  const isCategory = (slug: string | null | undefined): slug is string => !!slug && options.categories.includes(slug);
  const isIndustry = (slug: string | null | undefined): slug is string => !!slug && options.industries.includes(slug);
  const category = [prefill.category, product?.category].find(isCategory) ?? null;
  const industry = [prefill.industry, product?.industry, service?.industry].find(isIndustry) ?? '';
  return {
    industry,
    interest: service ? `service:${service.slug}` : category ? `category:${category}` : '',
    service: service ? { value: `service:${service.slug}`, label: service.name } : null,
    productName: product?.name ?? null,
  };
}
