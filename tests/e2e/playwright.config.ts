import { defineConfig, devices } from '@playwright/test';

// Blogs end to end (blogs spec §11), run by hand against a Vercel preview, not in CI: the repo
// doesn't install Playwright yet and CI never talks to a real Supabase project. See blogs.spec.ts
// for the environment it needs.
//
//   npm i -D @playwright/test && npx playwright install chromium webkit
//   E2E_BASE_URL=https://<preview>.vercel.app E2E_STORAGE_STATE=tests/e2e/.auth/writer.json \
//     E2E_QUEST_TITLE="3 days in Goa" npx playwright test -c tests/e2e/playwright.config.ts

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
  },
  // The three viewports of spec §3.8: iPhone SE, Pixel 7, desktop.
  projects: [
    { name: 'iphone-se', use: { ...devices['iPhone SE'], viewport: { width: 375, height: 667 } } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'], viewport: { width: 412, height: 915 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
