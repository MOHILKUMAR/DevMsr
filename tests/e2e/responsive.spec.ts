import { expect, test } from '@playwright/test';

const PAGES = ['/', '/industries/retail-jewellery-footwear', '/services/management-systems', '/pricing', '/request-quote', '/products', '/admin/login'];

for (const path of PAGES) {
  test(`${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('pricing explorer filters instantly and updates the URL', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByLabel('Industry').selectOption('healthcare');
  await expect(page).toHaveURL(/industry=healthcare/);
  await expect(page.getByText('OPD token management', { exact: true })).toBeVisible();
  await expect(page.getByText('Hotel website', { exact: true })).toHaveCount(0);
  await page.getByLabel('Budget').selectOption('under-10k');
  await expect(page.getByText(/prices? match your filters/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('Hotel website', { exact: true })).toBeVisible();
});
