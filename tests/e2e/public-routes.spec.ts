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
  '/payments',
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
    // Google shows about 60 characters of a title and 160 of a description.
    expect((await page.title()).length, 'title length').toBeLessThanOrEqual(60);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length, 'description length').toBeLessThanOrEqual(160);
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
  for (const path of ['/', '/industries/healthcare', '/services/pos-billing', '/pricing', '/payments', '/request-quote', '/blog/what-decides-the-cost-of-business-software']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(serious.map((violation) => `${path}: ${violation.id} (${violation.nodes.length})`)).toEqual([]);
  }
});

test('dark mode also passes axe colour contrast', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const path of ['/', '/pricing', '/payments', '/request-quote']) {
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
  for (const path of ['/', '/industries/healthcare', '/pricing', '/payments', '/blog/what-decides-the-cost-of-business-software']) {
    await page.goto(path);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const data = JSON.parse(block) as Record<string, unknown>;
      expect(JSON.stringify(data)).not.toMatch(/aggregateRating|"review"|ratingValue/);
    }
  }
});

test('each price explains what can increase it, and pricing links to the payment terms', async ({ page }) => {
  await page.goto('/pricing');
  await settle(page);
  const landing = page.locator('details', { has: page.getByText('Landing page', { exact: true }) }).first();
  await landing.locator('summary').click();
  await expect(landing.getByText('What can increase the price')).toBeVisible();
  await expect(landing.getByText('Page complexity')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where your project sits in the range.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What can raise a quote.' })).toBeVisible();
  await page.getByRole('link', { name: 'payments page' }).click();
  await expect(page).toHaveURL(/\/payments$/);
});

test('payments page sets out milestones, visit fees and change requests', async ({ page }) => {
  await page.goto('/payments');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How payments work.');
  for (const name of ['Booking and kickoff', 'Working demo', 'Final handover']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('₹20,000 to book, ₹12,000 at the working demo, ₹8,000 before handover', { exact: false })).toBeVisible();
  await expect(page.getByText('₹1,000 per visit', { exact: true })).toBeVisible();
  await expect(page.getByText('Changes up to ₹5,000', { exact: true })).toBeVisible();
  const faq = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((block) => JSON.parse(block) as { '@type'?: string; mainEntity?: unknown[] }).find((data) => data['@type'] === 'FAQPage');
  expect(faq?.mainEntity?.length).toBe(7);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Payments', exact: true })).toBeVisible();
});

test('home, about and contact describe the business with its address', async ({ page }) => {
  for (const path of ['/', '/about', '/contact']) {
    await page.goto(path);
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((block) => JSON.parse(block) as Record<string, unknown>);
    const business = blocks.find((data) => data['@type'] === 'ProfessionalService') as { '@id'?: string; address?: Record<string, string> } | undefined;
    expect(business?.['@id'], path).toBe('https://devmsr.in/#business');
    expect(business?.address).toMatchObject({ addressLocality: 'Gurugram', addressRegion: 'Haryana', addressCountry: 'IN' });
  }
  await expect(page.getByRole('contentinfo').locator('address')).toContainText('Orchid Business Park');
});


test('pages share their own preview image, and it loads', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const path of ['/', '/pricing', '/industries/healthcare', '/services/web-development', '/products/lead-desk']) {
    await page.goto(path);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og, path).toMatch(/^https:\/\/devmsr\.in\/og\/.+\.png$/);
    expect(await page.locator('meta[name="twitter:image"]').getAttribute('content')).toBe(og);
    expect(await page.locator('meta[property="og:image:alt"]').getAttribute('content')).toBeTruthy();
    const image = await request.get(new URL(og!).pathname);
    expect(image.status(), og!).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
    seen.add(og!);
  }
  // Product pages use the products card; every other page here has its own.
  expect(seen.size).toBe(5);
});

test('a concept product page explains the problem, labels its illustration and prices a custom build', async ({ page }) => {
  await page.goto('/products/opd-token-board');
  await expect(page.getByRole('heading', { name: 'The problem it solves.' })).toBeVisible();
  await expect(page.getByText('Crowded waiting areas')).toBeVisible();
  await expect(page.locator('figcaption')).toContainText('not a screenshot of finished software');
  await expect(page.getByRole('heading', { name: 'Built for you as a custom project.' })).toBeVisible();
  await expect(page.getByText('₹15,000 – ₹35,000')).toBeVisible();
  await expect(page.locator('section:has(#build-title)').getByRole('link', { name: 'Request a quote' })).toHaveAttribute('href', '/request-quote?industry=healthcare');
});
