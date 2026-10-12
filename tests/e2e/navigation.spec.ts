import { expect, test } from '@playwright/test';

test('desktop dropdowns open and close with the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop navigation only');
  await page.goto('/');
  const industries = page.getByRole('button', { name: 'Industries' });
  await industries.focus();
  await page.keyboard.press('Enter');
  await expect(industries).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#menu-industries').getByRole('link', { name: /Healthcare/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(industries).toHaveAttribute('aria-expanded', 'false');
  await expect(industries).toBeFocused();

  const services = page.getByRole('button', { name: 'Services' });
  await services.click();
  await page.locator('#menu-services').getByRole('link', { name: 'POS & Billing' }).click();
  await expect(page).toHaveURL(/\/services\/pos-billing$/);
});

test('mobile menu works with touch and keyboard', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation only');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.tap();
  await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav')).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).tap();
  await page.locator('#mobile-nav').getByRole('link', { name: 'Schools & Education' }).tap();
  await expect(page).toHaveURL(/\/industries\/education$/);
});

test('skip link moves focus to the main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await page.goto('/pricing');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('theme toggle cycles system → light → dark and persists', async ({ page, isMobile }) => {
  test.skip(isMobile, 'covered on desktop');
  await page.goto('/');
  const toggle = page.locator('[data-theme-toggle]').first();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(22, 24, 21)');
});
