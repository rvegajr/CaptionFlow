import { defineConfig, devices } from '@playwright/test';

const defaultDb =
  process.env.DATABASE_URL ?? 'postgresql://captionflow:captionflow@127.0.0.1:5432/captionflow';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: defaultDb,
      BASE_URL: 'http://127.0.0.1:3000',
      SESSION_SECRET: process.env.SESSION_SECRET ?? '01234567890123456789012345678901',
      NODE_ENV: 'test',
      DISABLE_LTI: 'true',
      FROM_EMAIL: process.env.FROM_EMAIL ?? 'test@test.com',
      EXPOSE_LAST_MAGIC_LINK: '1',
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
