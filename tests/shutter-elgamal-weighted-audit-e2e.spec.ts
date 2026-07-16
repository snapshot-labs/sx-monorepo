import { expect, test } from '@playwright/test';
import { readWeightedFixture, SKIP_REASON } from './localFixtures';

/**
 * Real-browser audit test for the two production-gap features:
 *
 *   A (trustless ballot audit) — the Verify-tally panel independently
 *     checks every encrypted ballot's zero-knowledge proof and confirms
 *     the recomputed aggregate matches the keypers' decrypted aggregate.
 *   B (voting-power weighting) — a closed proposal whose three ballots
 *     were cast with voting power [3, 1, 1] over choices [0, 0, 1] tallies
 *     to [4, 1] with no change to the ballot cryptography.
 *
 * Pre-conditions (the local stack must be up — see readme.md):
 *   - MySQL + hub (:3000) + sequencer (:3001) + keypers + UI (:8080).
 *   - A closed `shutter-elgamal` proposal exists with real, vp-weighted
 *     ballots in the `votes` table and a finalised tally. Its id + space
 *     are written to `.e2e-weighted-proposal.json` (the agent's headless
 *     harness produced one at scores [4, 1] with 3 ballots).
 *
 * UI must run with VITE_LOCAL_HUB_URL=http://localhost:3000/graphql.
 */

const fixture = readWeightedFixture() ?? {
  id: '',
  space: '',
  scores: [],
  ballots: 0
};

const URL_PATH = `/#/s-tn:${fixture.space}/proposal/${fixture.id}`;

test.describe('shutter-elgamal weighted audit (real browser)', () => {
  test.skip(!fixture.id, SKIP_REASON);

  test('Verify tally confirms vp-weighted ballots + matching aggregate', async ({
    page
  }) => {
    test.setTimeout(120_000);

    const errors: string[] = [];
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(URL_PATH);

    // The permanent-private tally panel only renders on a closed
    // shutter-elgamal proposal that loaded successfully.
    await expect(page.getByText('Permanent private tally')).toBeVisible({
      timeout: 30_000
    });

    const verifyBtn = page.getByRole('button', { name: 'Verify tally' });
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // (A) Tally recovered from the public decryption shares matches the
    // published scores.
    await expect(page.getByText('Tally matches published scores.')).toBeVisible(
      { timeout: 60_000 }
    );

    // (A) Every encrypted ballot passed its zk proof and the recomputed
    // vp-weighted aggregate equals the keypers' decrypted aggregate.
    await expect(
      page.getByText(
        `${fixture.ballots}/${fixture.ballots} ballots passed their zero-knowledge proof and the recomputed aggregate matches the decrypted one.`
      )
    ).toBeVisible({ timeout: 10_000 });

    // (B) The recovered per-choice totals reflect the voting-power
    // weighting: ballots vp=[3,1,1] over choices [0,0,1] => [4, 1].
    // Scope to the outermost panel div (the one that contains the whole
    // card, hence the recovered-totals list).
    const panel = page
      .locator('div', { hasText: 'Permanent private tally' })
      .first();
    for (const score of fixture.scores) {
      await expect(
        panel.locator('span.font-mono', { hasText: new RegExp(`^${score}$`) })
      ).toBeVisible();
    }

    const ignored = (e: string) =>
      e.includes('Failed to load resource') ||
      e.includes('favicon') ||
      e.includes('walletconnect') ||
      e.includes('coingecko') ||
      e.includes('snapshot.4everland') ||
      e.includes('safe.global') ||
      e.includes('snapshot.box') ||
      e.includes('apollo');
    expect(errors.filter(e => !ignored(e))).toEqual([]);
  });

  test('Engine-room detail surfaces the three cryptographic stages + setup card + bundle export', async ({
    page
  }) => {
    test.setTimeout(120_000);

    await page.goto(URL_PATH);

    // The lifecycle-wide "Cryptographic setup" card (#3) is collapsed by
    // default; clicking its header reveals the DKG / threshold facts.
    const setupHeader = page.getByRole('button', {
      name: /Cryptographic setup/
    });
    await expect(setupHeader).toBeVisible({ timeout: 30_000 });
    await setupHeader.click();
    await expect(page.getByText('Decryption threshold')).toBeVisible();
    await expect(page.getByText('Master public key')).toBeVisible();

    // Run the verification so the engine-room block (#1) appears.
    await expect(page.getByText('Permanent private tally')).toBeVisible();
    await page.getByRole('button', { name: 'Verify tally' }).click();
    await expect(page.getByText('Tally matches published scores.')).toBeVisible(
      { timeout: 60_000 }
    );

    // (#1) Progressive-disclosure toggle reveals the three stages.
    const toggle = page.getByText('Show cryptographic detail');
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(
      page.getByText('Per-ballot zero-knowledge proofs')
    ).toBeVisible();
    await expect(page.getByText('Homomorphic aggregate')).toBeVisible();
    await expect(page.getByText('Threshold decryption')).toBeVisible();

    // (#5) The offline-verifiable bundle export button is present.
    await expect(
      page.getByRole('button', { name: 'Download verification bundle' })
    ).toBeVisible();
  });
});
