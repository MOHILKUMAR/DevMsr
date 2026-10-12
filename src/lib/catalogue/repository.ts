import type { BlogPost, Catalogue, PortfolioProject } from '../../types/catalogue';
import { buildBundledBlogPosts, buildBundledCatalogue, buildBundledPortfolio } from '../../data/bundled-catalogue';
import { getServerConfig } from '../server/config';
import { createPublicClient } from '../supabase/clients';
import { log } from '../server/logger';
import { blogRowSchema, catalogueResponseSchema, portfolioRowSchema } from './schema';

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

async function fetchCatalogue(requestId: string): Promise<Catalogue> {
  const client = publicClientOrNull();
  if (!client) return buildBundledCatalogue();

  try {
    const { data, error } = await client.rpc('get_public_catalogue');
    if (error) throw new Error(`${error.code ?? 'rpc'}: ${error.message}`);
    const parsed = catalogueResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`catalogue shape mismatch: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join('.')).join(', ')}`);
    }
    return parsed.data;
  } catch (error) {
    log.error('catalogue.fallback', { requestId, error });
    return buildBundledCatalogue();
  }
}

/** Loads the catalogue once per request (memoised on Astro.locals). */
export function loadCatalogue(locals: App.Locals): Promise<Catalogue> {
  locals.cataloguePromise ??= fetchCatalogue(locals.requestId);
  return locals.cataloguePromise;
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

const BLOG_LIST_COLUMNS = 'id, slug, title, excerpt, content, cover_image, status, seo_title, seo_description, published_at';

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
