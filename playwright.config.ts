import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 10,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Record a trace for each test, but remove it from successful test runs. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: !process.env.CI, // for local dev
    actionTimeout: 60_000,
  },

  timeout: 600_000,
  globalSetup: require.resolve('./global-setup.ts'),

  reportSlowTests: {
    max: 10,
    threshold: 300_000, // 5 minutes
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'e2e in chromium',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'integration tests setup',
      testMatch: /integration-tests-setup\.ts/,
      teardown: 'integration tests teardown'
    },

    {
      name: 'integration tests in chromium',
      testDir: './integration-tests',
      dependencies: ['integration tests setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },

    {
      name: 'integration tests teardown',
      testMatch: /integration-tests-teardown\.ts/
    }
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  expect: {
    // Maximum time expect() should wait for the condition to be met.
    timeout: 60_000,
  },
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
