import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test.describe('Login Page', () => {
    test('renders login form with all elements', async ({ page }) => {
      await page.goto('/login');

      // Branding
      await expect(page.getByText('BossBoard').first()).toBeVisible();
      await expect(page.getByText('BB').first()).toBeVisible();

      // Form elements
      await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

      // Register link
      await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
    });

    test('email field has correct type and placeholder', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel('Email');
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });

    test('password field has correct type and placeholder', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('placeholder', 'Min. 8 characters');
    });

    test('shows error when submitting with API down', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('testpassword123');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Should show error since Express API is not running
      await expect(page.getByText(/Failed to connect to API|Login failed|fetch failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('navigates to register page via link', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('link', { name: 'Sign up' }).click();
      await expect(page).toHaveURL('/register');
    });

    test('preserves redirect query param', async ({ page }) => {
      await page.goto('/login?redirect=%2Finvoices');
      await expect(page).toHaveURL(/redirect=%2Finvoices/);
    });
  });

  test.describe('Register Page', () => {
    test('renders registration form with all elements', async ({ page }) => {
      await page.goto('/register');

      // Branding
      await expect(page.getByText('BossBoard').first()).toBeVisible();

      // Form elements
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

      // Login link
      await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    });

    test('name field is optional (no required attribute)', async ({ page }) => {
      await page.goto('/register');
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).not.toHaveAttribute('required', '');
    });

    test('email and password are required', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByLabel('Email')).toHaveAttribute('required', '');
      await expect(page.getByLabel('Password')).toHaveAttribute('required', '');
    });

    test('password has minimum length of 8', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByLabel('Password')).toHaveAttribute('minlength', '8');
    });

    test('shows error when submitting with API down', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill('newuser@example.com');
      await page.getByLabel('Password').fill('testpassword123');
      await page.getByRole('button', { name: 'Create account' }).click();

      await expect(page.getByText(/Failed to connect to API|Registration failed|fetch failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('navigates to login page via link', async ({ page }) => {
      await page.goto('/register');
      await page.getByRole('link', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
