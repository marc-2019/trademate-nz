import { test, expect, type APIRequestContext } from '@playwright/test';
import { registerEphemeralUser, type EphemeralUser } from './helpers/test-data';

/**
 * Navigation Link Smoke Test
 * PIR action #3 from 2026-04-27.
 *
 * 1. Registers a fresh ephemeral user (auto-cleanup at end)
 * 2. Logs in via the UI to set httpOnly session cookies
 * 3. Enumerates every <a> in <aside> + <header> + <main>
 * 4. Asserts each internal href returns 200/3xx (not 404 / 5xx)
 *
 * Honours cf_standing_directives.e2e-test-data-lifecycle: the
 * registered user is deleted in afterEach so we don't accumulate
 * `e2e-...@example.test` accounts in dev/staging/prod.
 */

const PROD_URL = process.env.PROD_URL || 'https://bossboard.instilligent.com';
const API_URL = process.env.PROD_API_URL || 'https://api.instilligent.com';

let ephemeral: EphemeralUser | null = null;
let request_: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  request_ = await playwright.request.newContext();
});

test.afterAll(async () => {
  await request_?.dispose();
});

test.afterEach(async () => {
  if (ephemeral) {
    try {
      await ephemeral.cleanup();
    } finally {
      ephemeral = null;
    }
  }
});

test.describe('Dashboard Navigation Link Smoke Test', () => {
  test('every nav link in dashboard returns 200', async ({ page }) => {
    ephemeral = await registerEphemeralUser(request_, API_URL, 'navsmoke');

    // Login via UI to set the httpOnly session cookies the middleware checks.
    await page.goto(`${PROD_URL}/login`);
    await page.getByLabel('Email').fill(ephemeral.email);
    await page.getByLabel('Password').fill(ephemeral.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();

    // Enumerate visible internal links in sidebar + header + main.
    const linkLocators = page.locator('aside a, header a, main a');
    await page.waitForTimeout(800);

    const count = await linkLocators.count();
    const hrefs = new Set<string>();
    for (let i = 0; i < count; i++) {
      const link = linkLocators.nth(i);
      if (await link.isVisible()) {
        const href = await link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          const absolute = new URL(href, page.url());
          if (absolute.origin === new URL(page.url()).origin) {
            hrefs.add(absolute.href);
          }
        }
      }
    }

    expect(hrefs.size, 'dashboard rendered with no internal nav links').toBeGreaterThan(0);

    const dead: { href: string; status: number }[] = [];
    for (const href of hrefs) {
      const response = await page.request.get(href);
      const status = response.status();
      // 2xx + 3xx + 401/403 mean "route exists". 404 / 5xx are dead.
      if (status === 404 || status >= 500 || status === 0) {
        dead.push({ href, status });
      }
    }
    if (dead.length > 0) {
      throw new Error(
        `${dead.length} dead nav link(s):\n` +
          dead.map((d) => `  ${d.href} -> ${d.status}`).join('\n'),
      );
    }
  });
});
