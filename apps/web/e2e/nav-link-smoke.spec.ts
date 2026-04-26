import { test, expect } from '@playwright/test';

/**
 * Navigation Link Smoke Test
 * PIR action #3 from 2026-04-27.
 * 
 * 1. Registers a fresh user
 * 2. Logs in
 * 3. Enumerate every <a> and <Link> in sidebar + header + main
 * 4. Asserts response is 200 for each.
 */

const PROD_URL = process.env.PROD_URL || 'https://bossboard.instilligent.com';
const API_URL = process.env.PROD_API_URL || 'https://api.instilligent.com';

test.describe('Dashboard Navigation Link Smoke Test', () => {
  test('every nav link in dashboard returns 200', async ({ page, request }) => {
    // 1. Register a fresh user against the target API
    const testEmail = `nav-smoke-${Date.now()}@instilligent.com`;
    const testPassword = 'SmokeTest123!';
    
    console.log(`Registering user ${testEmail} against ${API_URL}...`);
    const regRes = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        fullName: 'Nav Smoke Test',
        businessName: 'Nav Smoke Ltd',
      },
    });
    
    expect(regRes.ok(), `Registration failed: ${await regRes.text()}`).toBe(true);

    // 2. Login (via UI to ensure session cookies are set correctly)
    await page.goto(`${PROD_URL}/login`);
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // 3. Land on /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    // Check for a common dashboard element
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();

    // 4. Enumerate every <a> and <Link> visible in the sidebar + header + main content
    // We target <aside> (sidebar), <header>, and <main>
    const linkLocators = page.locator('aside a, header a, main a');
    
    // Wait a bit for any client-side links to render
    await page.waitForTimeout(1000);
    
    const count = await linkLocators.count();
    const hrefs = new Set<string>();
    
    for (let i = 0; i < count; i++) {
      const link = linkLocators.nth(i);
      if (await link.isVisible()) {
        const href = await link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          const absoluteUrl = new URL(href, page.url());
          // Only test internal links (same origin)
          if (absoluteUrl.origin === new URL(page.url()).origin) {
            hrefs.add(absoluteUrl.href);
          }
        }
      }
    }

    console.log(`Found ${hrefs.size} internal links to check:`, Array.from(hrefs));
    expect(hrefs.size).toBeGreaterThan(0);

    // 5. For each href, asserts response is 200 (not 404, not 500)
    for (const href of hrefs) {
      console.log(`Checking link: ${href}`);
      // Use page.request to share the browser's cookies/session
      const response = await page.request.get(href);
      expect(response.status(), `Link ${href} returned ${response.status()}`).toBe(200);
    }
  });
});
