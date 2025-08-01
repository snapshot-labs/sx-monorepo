import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: '.browser/test-results',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'yarn dev',
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
