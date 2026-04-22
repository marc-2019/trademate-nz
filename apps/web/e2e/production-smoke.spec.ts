import { test, expect } from '@playwright/test';

/**
 * Production smoke tests — run against the live production URL.
 * These catch deployment issues like the API_URL misconfiguration
 * that broke registration on 2026-04-13.
 *
 * Run with: npx playwright test e2e/production-smoke.spec.ts
 * Requires: PROD_URL env var (defaults to https://bossboard.instilligent.com)
 */

const PROD_URL = process.env.PROD_URL || 'https://bossboard.instilligent.com';
const API_URL = process.env.PROD_API_URL || 'https://api.instilligent.com';

test.describe('Production Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('landing page loads', async ({ page }) => {
    const res = await page.goto(PROD_URL);
    expect(res?.status()).toBe(200);
    // The nav logo splits "Boss" + "Board" across elements, so match on
    // the page title + the Get Started CTA instead of a single text node.
    await expect(page).toHaveTitle(/BossBoard/i);
    await expect(page.getByRole('link', { name: /Get Started/i }).first()).toBeVisible();
  });

  test('API health check', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(json.dependencies.database).toBe('connected');
  });

  test('registration form submits without proxy error', async ({ page }) => {
    await page.goto(`${PROD_URL}/register`);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    const testEmail = `smoke-test-${Date.now()}@instilligent.com`;

    await page.getByLabel('Name').fill('Smoke Test');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password').fill('SmokeTest123!');

    // Listen for the API response
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/register'),
      { timeout: 15000 }
    );

    await page.getByRole('button', { name: 'Create account' }).click();
    const response = await responsePromise;

    // The critical check: we should NOT get a 502 (proxy error) or HTML back
    expect(response.status()).not.toBe(502);

    const body = await response.json();
    // Either success or a proper API error (like "email already exists") — NOT a proxy error
    expect(body).not.toHaveProperty('error', 'PROXY_ERROR');

    // Should not show the "not valid JSON" error
    await expect(page.getByText(/not valid JSON/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('login form submits without proxy error', async ({ page }) => {
    await page.goto(`${PROD_URL}/login`);

    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login'),
      { timeout: 15000 }
    );

    await page.getByRole('button', { name: 'Sign in' }).click();
    const response = await responsePromise;

    // Should get a proper 401, not a 502 proxy error
    expect(response.status()).not.toBe(502);
    expect(response.status()).toBe(401);

    // Should show a proper error message, not JSON parse error
    await expect(page.getByText(/not valid JSON/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('API registration endpoint returns JSON', async ({ request }) => {
    const testEmail = `api-smoke-${Date.now()}@instilligent.com`;
    const res = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email: testEmail,
        password: 'SmokeTest123!',
        fullName: 'API Smoke Test',
        businessName: 'Smoke Test Ltd',
      },
    });

    // API returns 201 Created on successful registration.
    expect([200, 201]).toContain(res.status());
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(testEmail);
    expect(json.data.tokens.accessToken).toBeTruthy();
  });

  test('static assets load (CSS, JS)', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    await page.goto(PROD_URL, { waitUntil: 'networkidle' });

    const cssErrors = failedRequests.filter((url) => url.includes('.css'));
    const jsErrors = failedRequests.filter((url) => url.includes('.js'));

    expect(cssErrors).toHaveLength(0);
    expect(jsErrors).toHaveLength(0);
  });

  test('end-to-end signup → login → dashboard access', async ({ page, context }) => {
    // Exercises the full revenue-critical flow that BossBoard's 2026-04-13
    // API_URL-localhost outage would have caught: signup via UI proxy,
    // auto-login redirect, cookie-based session, then re-login with the
    // same credentials and access an authenticated page.
    const testEmail = `e2e-smoke-${Date.now()}@instilligent.com`;
    const testPassword = 'E2eSmoke123!';

    await page.goto(`${PROD_URL}/register`);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    await page.getByLabel('Name').fill('E2E Smoke Test');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password').fill(testPassword);

    const signupResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/register') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.getByRole('button', { name: 'Create account' }).click();
    const signupRes = await signupResponsePromise;

    // Proxy must return JSON (not HTML 502) and indicate success.
    expect(signupRes.status()).not.toBe(502);
    expect(signupRes.headers()['content-type']).toMatch(/application\/json/);
    const signupBody = await signupRes.json();
    expect(signupBody).not.toHaveProperty('error', 'PROXY_ERROR');
    expect(signupBody.success).toBe(true);

    // Auto-login redirects straight to the dashboard.
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Clear cookies to simulate a fresh session, then log back in.
    await context.clearCookies();
    await page.goto(`${PROD_URL}/login`);

    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password').fill(testPassword);

    const loginResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    const loginRes = await loginResponsePromise;

    expect(loginRes.status()).toBe(200);
    expect(loginRes.headers()['content-type']).toMatch(/application\/json/);
    const loginBody = await loginRes.json();
    expect(loginBody).not.toHaveProperty('error', 'PROXY_ERROR');
    expect(loginBody.success).toBe(true);

    // Basic post-auth action: dashboard loads with its widgets.
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('SWMS This Month')).toBeVisible();
  });
});
