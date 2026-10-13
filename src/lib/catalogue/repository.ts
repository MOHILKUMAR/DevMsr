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
 * Edge cache for the catalogue: every page needs it, and fetching it from the
 * database on each request was most of the server response time. Cloudflare's
 * Cache API keeps it per data centre for CATALOGUE_CACHE_SECONDS; admin saves
 * clear it (see invalidateCatalogueCache). Only successful database results
 * are cached, never the bundled fallback. Absent in Node (tests): no caching.
 */
const CATALOGUE_CACHE_KEY = 'https://devmsr.in/__cache/public-catalogue/v1';
export const CATALOGUE_CACHE_SECONDS = 300;

interface EdgeCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  delete(key: string): Promise<boolean>;
}

function edgeCache(): EdgeCache | null {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default ?? null;
}

async function readCachedCatalogue(cache: EdgeCache, requestId: string): Promise<Catalogue | null> {
  try {
    const hit = await cache.match(CATALOGUE_CACHE_KEY);
    if (!hit) return null;
    const parsed = catalogueResponseSchema.safeParse(await hit.json());
    return parsed.success ? parsed.data : null;
  } catch (error) {
    log.warn('catalogue.cache_read_failed', { requestId, error });
    return null;
  }
}

async function fetchCatalogue(locals: App.Locals): Promise<Catalogue> {
  const client = publicClientOrNull();
  if (!client) return buildBundledCatalogue();

  const cache = edgeCache();
  const cached = cache ? await readCachedCatalogue(cache, locals.requestId) : null;
  if (cached) return cached;

  try {
    const { data, error } = await client.rpc('get_public_catalogue');
    if (error) throw new Error(`${error.code ?? 'rpc'}: ${error.message}`);
    const parsed = catalogueResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`catalogue shape mismatch: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join('.')).join(', ')}`);
    }
    if (cache) {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CATALOGUE_CACHE_SECONDS}` },
      });
      const write = cache.put(CATALOGUE_CACHE_KEY, response).catch((error: unknown) => log.warn('catalogue.cache_write_failed', { requestId: locals.requestId, error }));
      // Store after responding when the platform allows it.
      const waitUntil = locals.cfContext?.waitUntil?.bind(locals.cfContext);
      if (waitUntil) waitUntil(write);
      else await write;
    }
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
 * Clears the cached catalogue in this data centre after an admin change.
 * Other data centres refresh within CATALOGUE_CACHE_SECONDS.
 */
export async function invalidateCatalogueCache(): Promise<void> {
  try {
    await edgeCache()?.delete(CATALOGUE_CACHE_KEY);
  } catch (error) {
    log.warn('catalogue.cache_clear_failed', { error });
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

export async function loadPortfolio(locals: App.Locals): Promise<PortfolioProject[]> {
  const client = publicClientOrNull();
  if (!client) return buildBundledPortfolio();
  try {
    const { data, error } = await client
      .from('public_portfolio')
      .select(PORTFOLIO_COLUMNS)
      .order('published_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => portfolioRowSchema.parse(row));
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
