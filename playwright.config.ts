import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the production build running on workerd
 * (`astro preview`), i.e. the same runtime as Cloudflare Workers.
 *
 *   npm run build && npm run test:e2e
 *
 * Without Supabase credentials the site serves bundled catalogue data and
 * lead forms report "temporarily unavailable"; tests cover both modes.
 * Set E2E_BASE_URL to test a deployed preview instead.
 */
const port = 4323;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  // One retry: the local Miniflare/workerd proxy occasionally drops a connection
  // under parallel load (logged as 'TypeError: fetch failed', HTTP 500 without
  // any app headers). 900 concurrent requests in a stress run showed no app errors.
  retries: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /(responsive|navigation)\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx astro preview --port ${port}`,
        port,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
