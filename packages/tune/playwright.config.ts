import { basename, resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

const PORT = 6106;
// Another package's Storybook, like STORYBOOK_DIR=../../apps/ui to prove a
// component moved into Tune still renders the same in the app
const STORYBOOK_DIR = process.env.STORYBOOK_DIR;

// Pixel-diff every Storybook story: `test:visual:update` records the
// baseline, `test:visual` fails on any changed pixel.
export default defineConfig({
  testDir: './test',
  outputDir: './test-results',
  ...(STORYBOOK_DIR && {
    testMatch: 'visual.spec.ts',
    snapshotDir: `./test/snapshots-${basename(STORYBOOK_DIR)}`
  }),
  timeout: 10 * 60 * 1000,
  fullyParallel: true,
  workers: 3,
  // threshold 0.01 allows ±2 color levels from anti-aliasing (top-layer popups
  // round text blending by 1). The default (0.2) misses light grays on white.
  expect: {
    timeout: 5000,
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.01 }
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    actionTimeout: 3000,
    navigationTimeout: 15000
  },
  // A static build: lighter than the dev server and never reloads mid-run.
  webServer: {
    command: `cd ${STORYBOOK_DIR ?? '.'} && bun run build-storybook --quiet && bun ${resolve('test/serve-storybook.ts')} ${PORT}`,
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: false,
    timeout: 5 * 60 * 1000
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 800, height: 600 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 700 } } }
  ]
});
