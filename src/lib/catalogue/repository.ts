import type { BlogPost, Catalogue, PortfolioProject } from '../../types/catalogue';
import { buildBundledBlogPosts, buildBundledCatalogue, buildBundledPortfolio } from '../../data/bundled-catalogue';
import { getServerConfig } from '../server/config';
import { createPublicClient } from '../supabase/clients';
import { log } from '../server/logger';
import { blogRowSchema, catalogueResponseSchema, portfolioRowSchema } from './schema';
import type { CatalogueFreshness } from './freshness';

/**
 * Public catalogue access. SERVER-ONLY.
 *
 * Reads go through the publishable key, so RLS limits results to active and
 * published rows. If Supabase is not configured (local development, CI) the
 * bundled seed data is used. If Supabase is configured but fails, we also
 * fall back — keeping marketing pages online — and log an error so the
 * outage is visible. Admin pages never use this fallback.
 */

function publicClientOrNull() {
  const config = getServerConfig();
  return config.supabase ? createPublicClient(config.supabase) : null;
}

/**
 * Edge cache for public data every visitor sees (the catalogue on every page,
 * the portfolio on the home page). Fetching them from the database on each
 * request was most of the server response time. Cloudflare's Cache API keeps
 * each for PUBLIC_CACHE_SECONDS per data centre; admin saves clear them (see
 * invalidatePublicCache). Only successful database results are cached, never
 * bundled fallbacks. Absent in Node (tests): no caching.
 */
const CACHE_KEYS = {
  catalogue: 'https://devmsr.in/__cache/public-catalogue/v1',
  portfolio: 'https://devmsr.in/__cache/public-portfolio/v1',
} as const;
export const PUBLIC_CACHE_SECONDS = 300;

interface EdgeCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  delete(key: string): Promise<boolean>;
}

function edgeCache(): EdgeCache | null {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default ?? null;
}

/** Cached JSON for `key`, passed through `parse`; null on a miss or anything unexpected. */
async function readCache<T>(key: string, parse: (json: unknown) => T | null, requestId: string): Promise<T | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(key);
    return hit ? parse(await hit.json()) : null;
  } catch (error) {
    log.warn('cache.read_failed', { requestId, key, error });
    return null;
  }
}

/** Stores raw JSON under `key`, after the response when the platform allows it. */
async function writeCache(locals: App.Locals, key: string, json: unknown): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  const response = new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${PUBLIC_CACHE_SECONDS}` },
  });
  const write = cache.put(key, response).catch((error: unknown) => log.warn('cache.write_failed', { requestId: locals.requestId, key, error }));
  const waitUntil = locals.cfContext?.waitUntil?.bind(locals.cfContext);
  if (waitUntil) waitUntil(write);
  else await write;
}

async function fetchCatalogue(locals: App.Locals): Promise<Catalogue> {
  const client = publicClientOrNull();
  if (!client) return buildBundledCatalogue();

  const cached = await readCache(CACHE_KEYS.catalogue, (json) => catalogueResponseSchema.safeParse(json).data ?? null, locals.requestId);
  if (cached) return cached;

  try {
    const { data, error } = await client.rpc('get_public_catalogue');
    if (error) throw new Error(`${error.code ?? 'rpc'}: ${error.message}`);
    const parsed = catalogueResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`catalogue shape mismatch: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join('.')).join(', ')}`);
    }
    await writeCache(locals, CACHE_KEYS.catalogue, data);
    return parsed.data;
  } catch (error) {
    log.error('catalogue.fallback', { requestId: locals.requestId, error });
    return buildBundledCatalogue();
  }
}

/** Loads the catalogue once per request (memoised on Astro.locals). */
export function loadCatalogue(locals: App.Locals): Promise<Catalogue> {
  locals.cataloguePromise ??= fetchCatalogue(locals);
  return locals.cataloguePromise;
}

/**
 * Clears the cached public data in this data centre after an admin change.
 * Other data centres refresh within PUBLIC_CACHE_SECONDS.
 */
export async function invalidatePublicCache(): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  for (const key of Object.values(CACHE_KEYS)) {
    try {
      await cache.delete(key);
    } catch (error) {
      log.warn('cache.clear_failed', { key, error });
    }
  }
}

/**
 * Last-changed times of the public catalogue rows, for sitemap dates. Five
 * small queries, run only when the sitemap is requested. Null when Supabase
 * is not configured or any query fails (the sitemap then omits dates).
 */
export async function loadCatalogueFreshness(locals: App.Locals): Promise<CatalogueFreshness | null> {
  const client = publicClientOrNull();
  if (!client) return null;
  try {
    const [services, prices, faqs, industries, products] = await Promise.all([
      client.from('services').select('id, slug, updated_at'),
      client.from('service_pricing').select('service_id, updated_at'),
      client.from('faqs').select('scope, industry_id, service_category, updated_at'),
      client.from('industries').select('id, slug, updated_at'),
      client.from('products').select('slug, updated_at'),
    ]);
    const failed = [services, prices, faqs, industries, products].find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
    const serviceSlug = new Map((services.data ?? []).map((row) => [row.id as string, row.slug as string]));
    const industrySlug = new Map((industries.data ?? []).map((row) => [row.id as string, row.slug as string]));
    return {
      services: (services.data ?? []).map((row) => ({ slug: row.slug as string, updatedAt: row.updated_at as string })),
      prices: (prices.data ?? []).flatMap((row) => {
        const slug = serviceSlug.get(row.service_id as string);
        return slug ? [{ serviceSlug: slug, updatedAt: row.updated_at as string }] : [];
      }),
      faqs: (faqs.data ?? []).map((row) => ({
        scope: row.scope as CatalogueFreshness['faqs'][number]['scope'],
        scopeKey: (row.industry_id ? industrySlug.get(row.industry_id as string) : (row.service_category as string | null)) ?? null,
        updatedAt: row.updated_at as string,
      })),
      industries: (industries.data ?? []).map((row) => ({ slug: row.slug as string, updatedAt: row.updated_at as string })),
      products: (products.data ?? []).map((row) => ({ slug: row.slug as string, updatedAt: row.updated_at as string })),
    };
  } catch (error) {
    log.warn('sitemap.freshness_unavailable', { requestId: locals.requestId, error });
    return null;
  }
}

const PORTFOLIO_COLUMNS =
  'id, slug, title, summary, description, project_type, technology_stack, image_urls, demo_url, repository_url, seo_title, seo_description, published_at, industry_slugs';

const parsePortfolio = (json: unknown): PortfolioProject[] | null => {
  if (!Array.isArray(json)) return null;
  const projects = json.map((row) => portfolioRowSchema.safeParse(row));
  return projects.every((project) => project.success) ? projects.map((project) => project.data!) : null;
};

export async function loadPortfolio(locals: App.Locals): Promise<PortfolioProject[]> {
  const client = publicClientOrNull();
  if (!client) return buildBundledPortfolio();
  const cached = await readCache(CACHE_KEYS.portfolio, parsePortfolio, locals.requestId);
  if (cached) return cached;
  try {
    const { data, error } = await client
      .from('public_portfolio')
      .select(PORTFOLIO_COLUMNS)
      .order('published_at', { ascending: false });
    if (error) throw new Error(error.message);
    const projects = (data ?? []).map((row) => portfolioRowSchema.parse(row));
    await writeCache(locals, CACHE_KEYS.portfolio, data ?? []);
    return projects;
  } catch (error) {
    log.error('portfolio.fallback', { requestId: locals.requestId, error });
    return buildBundledPortfolio();
  }
}

export async function loadPortfolioProject(locals: App.Locals, slug: string): Promise<PortfolioProject | null> {
  const projects = await loadPortfolio(locals);
  return projects.find((project) => project.slug === slug) ?? null;
}

const BLOG_LIST_COLUMNS = 'id, slug, title, excerpt, content, cover_image, status, seo_title, seo_description, published_at, updated_at';

export async function loadBlogPosts(locals: App.Locals): Promise<BlogPost[]> {
  const client = publicClientOrNull();
  if (!client) return buildBundledBlogPosts();
  try {
    const { data, error } = await client
      .from('blog_posts')
      .select(BLOG_LIST_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => blogRowSchema.parse(row));
  } catch (error) {
    log.error('blog.fallback', { requestId: locals.requestId, error });
    return buildBundledBlogPosts();
  }
}

export async function loadBlogPost(locals: App.Locals, slug: string): Promise<BlogPost | null> {
  const client = publicClientOrNull();
  if (!client) return buildBundledBlogPosts().find((post) => post.slug === slug) ?? null;
  try {
    const { data, error } = await client
      .from('blog_posts')
      .select(BLOG_LIST_COLUMNS)
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? blogRowSchema.parse(data) : null;
  } catch (error) {
    log.error('blog.fallback', { requestId: locals.requestId, error });
    return buildBundledBlogPosts().find((post) => post.slug === slug) ?? null;
  }
}
