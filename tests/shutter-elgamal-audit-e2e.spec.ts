import { expect, test } from '@playwright/test';
import { readProposalId, SKIP_REASON } from './localFixtures';

/**
 * Real end-to-end audit test: drives the actual proposal page UI in
 * Chromium against a locally orchestrated hub + 3 keypers.
 *
 * Pre-conditions (set up by `python scripts/e2e_orchestrator.py`):
 *   - MySQL on :3306 with the snapshot_hub schema loaded.
 *   - Hub on :3000 with a closed `shutter-elgamal` proposal seeded
 *     in space `e2e-private.eth`, scores=[1, 0].
 *   - 3 keypers ran DKG, encrypted ballot [Approve=1, Reject=0] under
 *     the joint mpk, and published 6 DLEQ decryption shares.
 *   - The proposal id was written to `.e2e-proposal-id`.
 *
 * UI must run with VITE_LOCAL_HUB_URL=http://localhost:3000/graphql.
 */

const PROPOSAL_ID = readProposalId();
const SPACE = 's-tn:e2e-private.eth';
const URL_PATH = `/#/${SPACE}/proposal/${PROPOSAL_ID}`;

test.describe('shutter-elgamal proposal page e2e', () => {
  test.skip(!PROPOSAL_ID, SKIP_REASON);

  test('verify-tally panel recovers [1, 0] from local hub + keypers', async ({
    page
  }) => {
    test.setTimeout(120_000);

    const errors: string[] = [];
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(URL_PATH);

    await expect(
      page.getByRole('heading', { name: 'E2E Private Proposal' })
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText('Permanent private tally')).toBeVisible({
      timeout: 10_000
    });

    const verifyBtn = page.getByRole('button', { name: 'Verify tally' });
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    await expect(page.getByText('Tally matches published scores.')).toBeVisible(
      { timeout: 60_000 }
    );

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
});
