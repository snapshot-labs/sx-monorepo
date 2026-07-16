import { expect, test } from '@playwright/test';
import { readProposalId, SKIP_REASON } from './localFixtures';

const PROPOSAL_ID = readProposalId();
const URL_PATH = `/#/s-tn:e2e-private.eth/proposal/${PROPOSAL_ID}`;

test.skip(!PROPOSAL_ID, SKIP_REASON);

test('capture verify-tally panel screenshot', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL_PATH);
  await expect(
    page.getByRole('heading', { name: 'E2E Private Proposal' })
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Verify tally' }).click();
  await expect(page.getByText('Tally matches published scores.')).toBeVisible({
    timeout: 60_000
  });
  await page.screenshot({
    path: 'evidence/proposal-verify-tally.png',
    fullPage: true
  });
});
