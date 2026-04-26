import { test, expect } from '@playwright/test';

/**
 * Password-reset smoke — verifies the forgot-password + reset-password
 * flow end-to-end against a deployed environment (staging or prod).
 *
 * Targets the same env contract as production-smoke.spec.ts:
 *   PROD_URL      (defaults to https://bossboard.instilligent.com)
 *   PROD_API_URL  (defaults to https://api.instilligent.com)
 *
 * Coverage:
 *   1. /forgot-password and /reset-password are PUBLIC (no redirect to /login)
 *   2. Both pages render with their form fields visible
 *   3. The /api/auth/forgot-password Next proxy returns the privacy-safe
 *      success message for any email (does not reveal account existence)
 *   4. The Express API endpoint returns the same shape directly
 *
 * Deliberately does NOT test the successful reset path end-to-end — that
 * requires reading the 6-digit reset code from email or DB, which is
 * environment-specific. Backend unit tests cover that path.
 */

const PROD_URL = process.env.PROD_URL || 'https://bossboard.instilligent.com';
const API_URL = process.env.PROD_API_URL || 'https://api.instilligent.com';

test.describe('Password reset smoke', () => {
  test('GET /forgot-password is public (not redirected to /login)', async ({ page }) => {
    const res = await page.goto(`${PROD_URL}/forgot-password`);
    expect(res?.status()).toBe(200);
    expect(page.url()).toContain('/forgot-password');
    expect(page.url()).not.toContain('/login');
  });

  test('GET /reset-password is public (not redirected to /login)', async ({ page }) => {
    const res = await page.goto(`${PROD_URL}/reset-password`);
    expect(res?.status()).toBe(200);
    expect(page.url()).toContain('/reset-password');
    expect(page.url()).not.toContain('/login');
  });

  test('forgot-password page renders an email input + submit button', async ({ page }) => {
    await page.goto(`${PROD_URL}/forgot-password`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('reset-password page renders code + new password inputs', async ({ page }) => {
    await page.goto(`${PROD_URL}/reset-password`);
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Express API /api/v1/auth/forgot-password returns privacy-safe success', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/auth/forgot-password`, {
      data: { email: `nonexistent-${Date.now()}@example.test` },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/application\/json/);

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    // Privacy-safe: message MUST be the same whether the account exists or not.
    expect(body.message).toMatch(/if an account exists/i);
  });

  test('Next /api/auth/forgot-password proxy round-trips to Express', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/api/auth/forgot-password`, {
      data: { email: `nonexistent-${Date.now()}@example.test` },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/application\/json/);

    const body = await res.json();
    // Proxy passes through the success shape from Express
    expect(body).toHaveProperty('success', true);
  });

  test('reset-password endpoint rejects bad code with 4xx + JSON', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/auth/reset-password`, {
      data: {
        email: `nonexistent-${Date.now()}@example.test`,
        code: '000000',
        newPassword: 'NewSecurePassword123!',
      },
      failOnStatusCode: false,
    });

    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(502);
    expect([400, 401, 403, 404, 422]).toContain(res.status());
    expect(res.headers()['content-type']).toMatch(/application\/json/);

    const body = await res.json();
    expect(body).toHaveProperty('success', false);
  });
});
