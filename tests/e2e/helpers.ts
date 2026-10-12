import type { ConsoleMessage, Page } from '@playwright/test';

/**
 * Waits until the page has loaded and every `client:load` island has hydrated.
 *
 * Do not wait for 'networkidle': with Cloudflare Turnstile on the form pages
 * the widget keeps polling, so the network never goes idle. `client:visible`
 * islands are not waited for; they hydrate only when scrolled into view.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => !document.querySelector('astro-island[client="load"][ssr]'), undefined, { timeout: 20_000 });
}

/** Console messages emitted by third-party frames we do not control (Turnstile). */
export function isThirdPartyMessage(message: ConsoleMessage): boolean {
  return message.location().url.startsWith('https://challenges.cloudflare.com/');
}
