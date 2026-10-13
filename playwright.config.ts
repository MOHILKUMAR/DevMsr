import { readFileSync } from 'node:fs';
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
 *
 * The local build reads .dev.vars. When that holds a real Supabase secret
 * key, the local site saves leads to that live database and emails the
 * owner, so the run defaults to E2E_READ_ONLY=1. Opt in to the saving test
 * with E2E_EXPECT_DATABASE=1 (it creates one real lead and sends one email).
 */
const port = 4323;

function devVarsHaveDatabase(): boolean {
  try {
    const key = /^SUPABASE_SECRET_KEY=\s*"?([^"\s]*)/m.exec(readFileSync('.dev.vars', 'utf8'))?.[1] ?? '';
    return key !== '' && key !== 'sb_secret_replace_me';
  } catch {
    return false;
  }
}

if (!process.env.E2E_BASE_URL && process.env.E2E_EXPECT_DATABASE !== '1' && devVarsHaveDatabase()) {
  process.env.E2E_READ_ONLY ??= '1';
}

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
