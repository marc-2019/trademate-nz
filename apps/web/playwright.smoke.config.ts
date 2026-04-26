import { defineConfig } from '@playwright/test';

/**
 * Minimal Playwright config for the BossBoard production smoke suite.
 *
 * The main playwright.config.ts spawns `next dev` via webServer, which is
 * right for local e2e but blocks a pure production smoke run (no Next
 * binary installed on CI/cron hosts, and production-smoke.spec.ts targets
 * the Vercel deploy directly). This config is deliberately lean: no
 * webServer, one browser.
 *
 * Run:
 *   npx playwright test e2e/production-smoke.spec.ts \
 *     --config=playwright.smoke.config.ts
 *
 * Override target:
 *   PROD_URL=https://staging.bossboard.instilligent.com \
 *     PROD_API_URL=https://api-staging.instilligent.com \
 *     npx playwright test e2e/production-smoke.spec.ts \
 *     --config=playwright.smoke.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['production-smoke.spec.ts', 'password-reset-smoke.spec.ts'],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,

  reporter: 'list',

  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: undefined,
});
