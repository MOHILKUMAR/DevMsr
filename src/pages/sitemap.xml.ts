import type { APIRoute } from 'astro';
import { SERVICE_CATEGORY_CONTENT } from '../data/service-categories';
import { getIndustryContent } from '../data/industries';
import { loadBlogPosts, loadCatalogue, loadPortfolio } from '../lib/catalogue/repository';
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

/** XML sitemap generated from live catalogue data, so it always matches what is published. */
export const GET: APIRoute = async ({ locals }) => {
  const [catalogue, portfolio, posts] = await Promise.all([loadCatalogue(locals), loadPortfolio(locals), loadBlogPosts(locals)]);

  const entries: { path: string; lastmod?: string }[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...catalogue.industries.filter((industry) => getIndustryContent(industry.slug)).map((industry) => ({ path: `/industries/${industry.slug}` })),
    ...SERVICE_CATEGORY_CONTENT.map((category) => ({ path: `/services/${category.slug}` })),
    ...catalogue.products.map((product) => ({ path: `/products/${product.slug}` })),
    ...portfolio.map((project) => ({ path: `/portfolio/${project.slug}`, lastmod: project.publishedAt ?? undefined })),
    ...posts.map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.publishedAt ?? undefined })),
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
