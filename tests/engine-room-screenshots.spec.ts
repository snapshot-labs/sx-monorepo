import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';
import { readWeightedFixture, SKIP_REASON } from './localFixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixture = readWeightedFixture() ?? { id: '', space: '' };

const URL_PATH = `/#/s-tn:${fixture.space}/proposal/${fixture.id}`;
const OUT = resolve(__dirname, '..', '..', '.engine-room-shots');

test.skip(!fixture.id, SKIP_REASON);

/**
 * Spacing / visual capture for the five engine-room insight features.
 * Not an assertion test — it just drops PNGs into .engine-room-shots so
 * the layout (gaps, padding, stacked cards) can be eyeballed.
 */
test('capture engine-room panels for spacing review', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(OUT, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 2200 });
  await page.goto(URL_PATH);

  // Cryptographic setup card (#3) + collapsed tally panel.
  await page.getByText('Cryptographic setup').waitFor({ timeout: 30_000 });
  await page.getByText('Permanent private tally').waitFor();
  await page.screenshot({
    path: resolve(OUT, '01-setup-and-collapsed.png'),
    fullPage: true
  });

  // Expand the setup card to show the hub + keypers diagram.
  await page.getByRole('button', { name: /Cryptographic setup/ }).click();
  await page.getByText('Shared key').waitFor();
  await page.screenshot({
    path: resolve(OUT, '01b-setup-expanded.png'),
    fullPage: true
  });

  // Run verification.
  await page.getByRole('button', { name: 'Verify tally' }).click();
  await page
    .getByText('Tally matches published scores.')
    .waitFor({ timeout: 60_000 });
  await page.screenshot({
    path: resolve(OUT, '02-verified-collapsed.png'),
    fullPage: true
  });

  // Expand the engine room (#1) and capture all three stages + bundle (#5).
  await page.getByText('Show cryptographic detail').click();
  await page.getByText('Threshold decryption').waitFor();
  await page.screenshot({
    path: resolve(OUT, '03-engine-room-expanded.png'),
    fullPage: true
  });

  // Focused crop of just the verify panel for tighter spacing review.
  const panel = page
    .locator('div', { hasText: 'Permanent private tally' })
    .first();
  await panel.screenshot({ path: resolve(OUT, '04-verify-panel-only.png') });
});
