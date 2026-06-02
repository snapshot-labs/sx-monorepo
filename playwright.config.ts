import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: '.browser/test-results',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure'
  },
  expect: {
    // 5 seconds is not quite enough it seems
    timeout: 10000
  },
  // Local: tests spin up `bun run dev` if no PLAYWRIGHT_BASE_URL is set.
  // CI: PLAYWRIGHT_BASE_URL points at the Netlify livenet preview, so no
  // local dev server is needed.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe'
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          channel: 'chromium'
        },
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
});
