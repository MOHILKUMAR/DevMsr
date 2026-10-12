import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isThirdPartyMessage, settle } from './helpers';

const ROUTES = [
  '/',
  '/industries',
  '/industries/healthcare',
  '/industries/hotels-hospitality',
  '/industries/restaurants',
  '/industries/retail-jewellery-footwear',
  '/industries/travel-tourism',
  '/industries/education',
  '/services',
  '/services/web-development',
  '/services/ecommerce',
  '/services/custom-software',
  '/services/management-systems',
  '/services/pos-billing',
  '/services/crm-erp',
  '/services/ai-automation',
  '/services/ai-agents-chatbots',
  '/services/voice-ai',
  '/services/integrations-payments',
  '/services/hosting-maintenance',
  '/products',
  '/products/lead-desk',
  '/pricing',
  '/portfolio',
  '/portfolio/devmsr-website-and-lead-desk',
  '/about',
  '/contact',
  '/request-quote',
  '/book-a-demo',
  '/blog',
  '/blog/what-decides-the-cost-of-business-software',
  '/privacy',
  '/terms',
];

for (const route of ROUTES) {
  test(`${route} renders with metadata, one h1 and no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !isThirdPartyMessage(message)) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/DevMsr\.in/);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe(`https://devmsr.in${route === '/' ? '' : route}`);
    await expect(page.locator('main#main')).toBeVisible();
    await settle(page);
    // Includes Content-Security-Policy violations, which surface as console errors.
    expect(errors).toEqual([]);
  });
}

test('unknown pages and slugs return 404 with a helpful page', async ({ page }) => {
  for (const path of ['/does-not-exist', '/industries/space', '/services/teleportation', '/products/nope', '/blog/nope', '/portfolio/nope']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist.');
  }
});

test('key pages have no serious accessibility violations (axe, WCAG 2.2 AA)', async ({ page }) => {
  for (const path of ['/', '/industries/healthcare', '/services/pos-billing', '/pricing', '/request-quote', '/blog/what-decides-the-cost-of-business-software']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(serious.map((violation) => `${path}: ${violation.id} (${violation.nodes.length})`)).toEqual([]);
  }
});

test('dark mode also passes axe colour contrast', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const path of ['/', '/pricing', '/request-quote']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations.map((violation) => `${path}: ${violation.nodes.length} nodes`)).toEqual([]);
  }
});

test('sitemap lists every public route and robots.txt points to it', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const route of ROUTES) expect(sitemap).toContain(`<loc>https://devmsr.in${route === '/' ? '' : route}</loc>`);
  expect(sitemap).not.toContain('/admin');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin');
  expect(robots).toContain('Sitemap: https://devmsr.in/sitemap.xml');
});

test('structured data is valid JSON and never claims ratings or reviews', async ({ page }) => {
  for (const path of ['/', '/industries/healthcare', '/pricing', '/blog/what-decides-the-cost-of-business-software']) {
    await page.goto(path);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const data = JSON.parse(block) as Record<string, unknown>;
      expect(JSON.stringify(data)).not.toMatch(/aggregateRating|"review"|ratingValue/);
    }
  }
});
