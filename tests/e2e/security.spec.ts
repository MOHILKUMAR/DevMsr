import { expect, test } from '@playwright/test';

test('security headers are present on rendered pages', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-request-id']).toBeTruthy();
  const csp = headers['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toMatch(/script-src [^;]*'sha256-/);
  expect(csp).not.toContain('unsafe-inline');
});

test('form pages are never cached', async ({ request }) => {
  for (const path of ['/contact', '/request-quote', '/book-a-demo']) {
    const response = await request.get(path);
    expect(response.headers()['cache-control'], `${path} → ${response.status()} ${JSON.stringify(response.headers())}`).toBe('private, no-store');
  }
});

test('admin pages redirect to sign-in when signed out', async ({ request }) => {
  for (const path of ['/admin', '/admin/leads', '/admin/leads/00000000-0000-0000-0000-000000000000', '/admin/pricing', '/admin/settings']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(303);
    expect(response.headers()['location']).toBe(`/admin/login?next=${encodeURIComponent(path)}`);
    expect(response.headers()['cache-control']).toBe('private, no-store');
  }
});

test('admin actions reject unauthenticated calls', async ({ request, baseURL }) => {
  for (const action of ['admin.leads.updateStatus', 'admin.pricing.save', 'admin.settings.save', 'admin.leads.delete']) {
    const response = await request.post(`/_actions/${action}`, {
      multipart: { id: '00000000-0000-0000-0000-000000000000', status: 'won' },
      headers: { Origin: baseURL ?? '' },
    });
    expect(response.status(), action).toBe(401);
  }
});

test('cross-site form posts are blocked (CSRF origin check)', async ({ request }) => {
  const response = await request.post('/_actions/leads.submit', {
    form: { name: 'x' },
    headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
  });
  expect(response.status()).toBe(403);
});

test('sign-in page is not indexable and keeps redirects on-site', async ({ page }) => {
  await page.goto('/admin/login?next=https://evil.example/steal');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('input[name="next"]')).toHaveValue('/admin');
  await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
});

test('no server secrets or keys appear in page source', async ({ request }) => {
  for (const path of ['/', '/request-quote', '/admin/login', '/pricing']) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(/sb_secret_|SUPABASE_SECRET_KEY|RESEND_API_KEY|APP_SECRET|TURNSTILE_SECRET_KEY|service_role/);
  }
});

test('action responses for lead submissions are not cacheable', async ({ request, baseURL }) => {
  const response = await request.post('/_actions/leads.submit', { multipart: { formType: 'contact' }, headers: { Origin: baseURL ?? '' } });
  expect(response.headers()['cache-control']).toBe('private, no-store');
  const body = await response.text();
  expect(body).not.toMatch(/stack|at .*\.mjs|postgres|supabase/i);
});
