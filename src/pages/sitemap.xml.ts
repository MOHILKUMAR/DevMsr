import type { APIRoute } from 'astro';
import { SERVICE_CATEGORY_CONTENT } from '../data/service-categories';
import { getIndustryContent } from '../data/industries';
import { loadBlogPosts, loadCatalogue, loadCatalogueFreshness, loadPortfolio } from '../lib/catalogue/repository';
import { catalogueLastmods } from '../lib/catalogue/freshness';
import { escapeHtml } from '../lib/content/markdown';
import { SITE_URL } from '../lib/seo';

const STATIC_PATHS = [
  '/',
  '/industries',
  '/services',
  '/products',
  '/pricing',
  '/payments',
  '/portfolio',
  '/about',
  '/contact',
  '/request-quote',
  '/book-a-demo',
  '/blog',
  '/privacy',
  '/terms',
];

/**
 * XML sitemap generated from live catalogue data, so it always matches what
 * is published. <lastmod> is the latest change to the rows a page shows (see
 * catalogueLastmods); pages without a reliable date get none.
 */
export const GET: APIRoute = async ({ locals }) => {
  const [catalogue, portfolio, posts, freshness] = await Promise.all([loadCatalogue(locals), loadPortfolio(locals), loadBlogPosts(locals), loadCatalogueFreshness(locals)]);
  const lastmods = freshness ? catalogueLastmods(catalogue, freshness) : new Map<string, string>();
  const latest = (dates: (string | null | undefined)[]) => dates.filter((date): date is string => Boolean(date)).sort().at(-1);
  lastmods.set('/blog', latest(posts.map((post) => post.updatedAt ?? post.publishedAt)) ?? '');
  lastmods.set('/portfolio', latest(portfolio.map((project) => project.publishedAt)) ?? '');
  const dated = (path: string) => ({ path, lastmod: lastmods.get(path) || undefined });

  const entries: { path: string; lastmod?: string }[] = [
    ...STATIC_PATHS.map(dated),
    ...catalogue.industries.filter((industry) => getIndustryContent(industry.slug)).map((industry) => dated(`/industries/${industry.slug}`)),
    ...SERVICE_CATEGORY_CONTENT.map((category) => dated(`/services/${category.slug}`)),
    ...catalogue.products.map((product) => dated(`/products/${product.slug}`)),
    ...portfolio.map((project) => ({ path: `/portfolio/${project.slug}`, lastmod: project.publishedAt ?? undefined })),
    ...posts.map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.updatedAt ?? post.publishedAt ?? undefined })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const loc = escapeHtml(new URL(entry.path, SITE_URL).toString().replace(/\/$/, '') || SITE_URL);
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : '';
      return `  <url><loc>${loc}</loc>${lastmod}</url>`;
    }),
    '</urlset>',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
