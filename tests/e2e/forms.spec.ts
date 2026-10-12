import { expect, test } from '@playwright/test';

/**
 * Lead form behaviour that can be verified without a database:
 * client + server validation, spam defences and honest failure states.
 * With Supabase configured (E2E_EXPECT_DATABASE=1), the final test expects
 * a saved lead and a reference number instead of "unavailable".
 *
 * Against a deployed site with a real database, set E2E_READ_ONLY=1: tests
 * that could save a genuine lead (and email the owner) are then skipped.
 */

const READ_ONLY = process.env.E2E_READ_ONLY === '1';

/**
 * Waits until the React form island has hydrated. Before that, the form is a
 * plain HTML form (the no-JavaScript fallback), so a click would submit it to
 * the server directly instead of running client-side validation.
 */
async function waitForForm(page: import('@playwright/test').Page) {
  await page.locator('astro-island:not([ssr]) form').waitFor({ state: 'attached', timeout: 20_000 });
}

async function fillValid(page: import('@playwright/test').Page) {
  await page.getByLabel('Name (required)').fill('Playwright Test');
  await page.getByLabel('Email (required)').fill('e2e@example.com');
  await page.getByLabel(/Industry/).selectOption('restaurants');
  await page.getByLabel(/Interested in/).selectOption('category:pos-billing');
  await page.getByLabel(/Describe your project|How can we help|What would you like/).fill('We need a POS with KOT printing for two counters and a kitchen screen.');
  await page.getByRole('checkbox').check();
}

test('shows inline and summary errors for an empty submission', async ({ page }) => {
  await page.goto('/request-quote');
  await waitForForm(page);
  await page.getByRole('button', { name: 'Request a quote' }).click();
  const summary = page.getByRole('alert');
  await expect(summary).toContainText('Please check the highlighted fields');
  await expect(summary).toBeFocused();
  await expect(page.getByText('Please enter your name.').first()).toBeVisible();
  await expect(page.getByLabel('Email (required)')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Please confirm you have read the privacy policy.').first()).toBeVisible();
});

test('requires a phone number when WhatsApp is the preferred contact', async ({ page }) => {
  await page.goto('/contact');
  await waitForForm(page);
  await fillValid(page);
  await page.getByLabel(/Preferred contact method/).selectOption('whatsapp');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Please add a phone number so we can reach you that way.').first()).toBeVisible();
});

test('preselects industry and service from the URL', async ({ page }) => {
  await page.goto('/request-quote?industry=education&service=admission-crm');
  await expect(page.getByLabel(/Industry/)).toHaveValue('education');
  await expect(page.getByLabel(/Interested in/)).toHaveValue('service:admission-crm');
});

test('ignores unknown preselection values', async ({ page }) => {
  await page.goto('/request-quote?industry=<script>&service=nope');
  await expect(page.getByLabel(/Industry/)).toHaveValue('');
  await expect(page.getByLabel(/Interested in/)).toHaveValue('');
});

test('rejects a submission made within seconds of loading the page', async ({ page }) => {
  test.skip(READ_ONLY, 'timing-dependent: on a slow network the form can be old enough to be accepted');
  await page.goto('/book-a-demo');
  await waitForForm(page);
  await fillValid(page);
  await page.getByRole('button', { name: 'Request a demo' }).click();
  await expect(page.getByRole('alert')).toContainText(/very quick|temporarily unavailable/);
});

test('a valid submission either saves (with database) or fails honestly (without)', async ({ page }) => {
  test.skip(READ_ONLY, 'would create a real lead and email the owner');
  await page.goto('/request-quote');
  await waitForForm(page);
  await fillValid(page);
  await page.waitForTimeout(3500); // the signed form token must be at least 3 seconds old
  await page.getByRole('button', { name: 'Request a quote' }).click();
  if (process.env.E2E_EXPECT_DATABASE === '1') {
    await expect(page.getByRole('status')).toContainText(/reference number is DM-\d{6}-[0-9A-F]{6}/);
  } else {
    await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
    // The visitor's input is kept so nothing has to be retyped.
    await expect(page.getByLabel('Name (required)')).toHaveValue('Playwright Test');
  }
});

test('the honeypot field is hidden from people and assistive technology', async ({ page }) => {
  await page.goto('/contact');
  const honeypot = page.locator('input[name="companyWebsite"]');
  await expect(honeypot).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('[aria-hidden="true"]:has(input[name="companyWebsite"])')).toHaveCount(1);
  // Positioned off-screen rather than display:none, which some bots detect.
  const box = await honeypot.boundingBox();
  expect(box === null || box.x + box.width < 0).toBe(true);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('forms keep native validation and post to the server action', async ({ page }) => {
    await page.goto('/request-quote');
    const form = page.locator('main form');
    await expect(form).toHaveAttribute('action', /_action=leads\.submit/);
    await expect(form).not.toHaveAttribute('novalidate', /.*/);
    await expect(page.getByLabel('Name (required)')).toHaveAttribute('required', '');
    await expect(page.locator('input[name="formType"]')).toHaveValue('quote');
    await expect(page.locator('input[name="submissionId"]')).toHaveValue(/^[0-9a-f-]{36}$/);
  });

  test('pricing filters work through the query string', async ({ page }) => {
    await page.goto('/pricing?industry=restaurants');
    await expect(page.getByText('Restaurant POS', { exact: true })).toBeVisible();
    await expect(page.getByText('Hotel website', { exact: true })).toHaveCount(0);
  });
});
