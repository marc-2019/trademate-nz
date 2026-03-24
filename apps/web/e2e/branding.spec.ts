import { test, expect } from '@playwright/test';

test.describe('Branding & Visual Design', () => {
  test('login page has navy background', async ({ page }) => {
    await page.goto('/login');
    // The auth layout div has bg-primary class
    const bg = await page.locator('.min-h-screen').first().evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // #1A2A44 = rgb(26, 42, 68)
    expect(bg).toBe('rgb(26, 42, 68)');
  });

  test('sign in button has accent orange color', async ({ page }) => {
    await page.goto('/login');
    const btn = page.getByRole('button', { name: 'Sign in' });
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    // #FF6B35 = rgb(255, 107, 53)
    expect(bg).toBe('rgb(255, 107, 53)');
  });

  test('page title is BossBoard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('BossBoard');
  });

  test('login form card has white background', async ({ page }) => {
    await page.goto('/login');
    // The card component wraps the form
    const card = page.locator('[class*="bg-surface"]').first();
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(255, 255, 255)');
  });

  test('register page has same navy background as login', async ({ page }) => {
    await page.goto('/register');
    const bg = await page.locator('.min-h-screen').first().evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe('rgb(26, 42, 68)');
  });
});
