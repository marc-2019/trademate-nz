import { test, expect } from '@playwright/test';

test.describe('Auth Middleware', () => {
  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });

  test('redirects unauthenticated user from /certifications to /login', async ({ page }) => {
    await page.goto('/certifications');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcertifications/);
  });

  test('redirects unauthenticated user from /swms to /login', async ({ page }) => {
    await page.goto('/swms');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fswms/);
  });

  test('redirects unauthenticated user from /settings to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings/);
  });

  test('redirects unauthenticated user from /teams to /login', async ({ page }) => {
    await page.goto('/teams');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fteams/);
  });

  test('does NOT redirect /login (public path)', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('does NOT redirect /register (public path)', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('redirect param encodes the original path', async ({ page }) => {
    await page.goto('/expenses');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/expenses');
  });
});
