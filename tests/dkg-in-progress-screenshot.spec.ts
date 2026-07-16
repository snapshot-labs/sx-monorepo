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
 * Forces the DKG-in-progress state by rewriting the GraphQL proposal
 * response so the proposal looks active with no master public key yet
 * (te_mpk = null). Confirms the key-generation animation + disabled vote
 * button render instead of the ballot form. Screenshot only.
 */
test('DKG-in-progress shows key-generation animation + disabled vote', async ({
  page
}) => {
  test.setTimeout(120_000);
  mkdirSync(OUT, { recursive: true });

  await page.route('**/graphql', async route => {
    const resp = await route.fetch();
    let body: any;
    try {
      body = await resp.json();
    } catch {
      return route.fulfill({ response: resp });
    }
    const p = body?.data?.proposal;
    if (p && (p.privacy === 'shutter-elgamal' || 'te_mpk' in p)) {
      const now = Math.floor(Date.now() / 1000);
      p.te_mpk = null;
      p.state = 'active';
      p.start = now - 60;
      p.end = now + 3600;
      p.max_end = now + 3600;
      p.completed = false;
    }
    return route.fulfill({ response: resp, json: body });
  });

  await page.goto(URL_PATH);
  await page.getByText('Generating encryption keys').waitFor({
    timeout: 30_000
  });
  await page.screenshot({
    path: resolve(OUT, '05-dkg-in-progress.png'),
    fullPage: true
  });
});
