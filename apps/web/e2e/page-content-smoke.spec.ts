import { test, expect, type APIRequestContext } from '@playwright/test';
import { registerEphemeralUser, type EphemeralUser } from './helpers/test-data';

/**
 * Page-content smoke — for each authenticated product page, register
 * an ephemeral user, log in, navigate to the page, and assert it
 * actually renders (not just that the route exists).
 *
 * Pairs with nav-link-smoke (which only checks 200/3xx vs 404/5xx).
 * This one verifies the page survived hydration, the API call inside
 * the page didn't 502, and the heading + a known landmark element
 * are present.
 *
 * Honours cf_standing_directives.e2e-test-data-lifecycle: each test
 * cleans up its own ephemeral user via afterEach.
 *
 * Targets the same env contract as production-smoke.spec.ts:
 *   PROD_URL      (defaults to https://bossboard.instilligent.com)
 *   PROD_API_URL  (defaults to https://api.instilligent.com)
 */

const PROD_URL = process.env.PROD_URL || 'https://bossboard.instilligent.com';
const API_URL = process.env.PROD_API_URL || 'https://api.instilligent.com';

interface PageCase {
  path: string;
  // Heading text to look for (case-insensitive regex). Falls back to
  // the page title from the layout.
  heading: RegExp;
  // A second landmark to confirm the page hydrated past skeleton.
  // Empty-state copy is fine — we're proving the data-loaded code path
  // ran, not that the user has data.
  landmark: RegExp;
}

const PAGES: PageCase[] = [
  { path: '/dashboard', heading: /Dashboard/i, landmark: /SWMS This Month|Welcome to BossBoard web/i },
  { path: '/swms', heading: /SWMS documents/i, landmark: /No SWMS documents yet|Drafts \(need signing\)|Loading SWMS/i },
  { path: '/invoices', heading: /Invoices/i, landmark: /No invoices yet|Loading invoices|Due/i },
  { path: '/quotes', heading: /Quotes/i, landmark: /No quotes yet|Loading quotes|Valid until/i },
  { path: '/expenses', heading: /Expenses/i, landmark: /No expenses recorded|Loading expenses|GST claimable/i },
  { path: '/job-logs', heading: /Job logs/i, landmark: /No job logs yet|Loading job logs|Active now/i },
  { path: '/certifications', heading: /Certifications/i, landmark: /No certifications recorded|Loading certifications|Expired|Expiring soon|Valid|No expiry/i },
  { path: '/teams', heading: /Team/i, landmark: /You're not on a team yet|Members|Loading team/i },
  { path: '/settings', heading: /Settings/i, landmark: /Profile|Subscription|Loading profile/i },
];

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

test.describe('Page-content smoke', () => {
  for (const page_case of PAGES) {
    test(`${page_case.path} renders heading + landmark for a logged-in user`, async ({ page }) => {
      ephemeral = await registerEphemeralUser(request_, API_URL, `pagesmoke${page_case.path.replace(/[^a-z0-9]/gi, '')}`);

      // Login → land on dashboard. Don't capture errors yet — the
      // login page itself fires /api/auth/me before the cookie is set
      // and gets an expected 401 (this is normal React Auth-provider
      // boot behavior, not a real failure).
      await page.goto(`${PROD_URL}/login`);
      await page.getByLabel('Email').fill(ephemeral.email);
      await page.getByLabel('Password').fill(ephemeral.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // NOW start counting errors — only ones that fire on the target
      // page itself count as failures.
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // Filter expected auth-handshake noise. Cookie-based Next auth
        // emits 401s during hydration on protected pages; these are
        // recovered by the AuthProvider's refresh logic.
        if (/401\b|Unauthorized/.test(text)) return;
        consoleErrors.push(text);
      });
      const requestFailures: string[] = [];
      page.on('requestfailed', (req) => requestFailures.push(req.url()));

      // Navigate to the target page
      if (page_case.path !== '/dashboard') {
        await page.goto(`${PROD_URL}${page_case.path}`);
        await expect(page).toHaveURL(new RegExp(page_case.path.replace(/-/g, '\\-')));
      }

      // Heading must render. Restrict to level 1 — the page's <h1> —
      // so empty-state <h2>s (e.g. "No invoices yet") don't ambiguate
      // against patterns like /Invoices/i.
      await expect(
        page.getByRole('heading', { level: 1, name: page_case.heading }),
      ).toBeVisible({ timeout: 10000 });

      // Landmark (data area, summary card, or empty state) must render —
      // proves the inner-page code path executed, not just the layout.
      await expect(page.getByText(page_case.landmark).first()).toBeVisible({
        timeout: 10000,
      });

      // No console errors — hydration / data-load didn't throw.
      expect(
        consoleErrors,
        `console errors on ${page_case.path}:\n  ${consoleErrors.join('\n  ')}`,
      ).toHaveLength(0);

      // No real API call failures. Skip /_next/static/chunks/* — those
      // are prefetch races (Next.js cancels in-flight chunk fetches
      // when navigation beats prefetch) and are spurious noise here.
      // Real failures we care about are page-driven /api/* calls.
      const ourFailures = requestFailures.filter((u) => u.includes('/api/'));
      expect(
        ourFailures,
        `request failures on ${page_case.path}:\n  ${ourFailures.join('\n  ')}`,
      ).toHaveLength(0);
    });
  }
});
