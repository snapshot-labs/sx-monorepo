import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/iframe.html?id=ui-selector--interactive&viewMode=story');
  await page.waitForLoadState('networkidle');
});

const picks = (page: Page) => page.locator('#picks');

test('arrow keys move without picking, Enter picks', async ({ page }) => {
  await page.getByRole('option', { name: 'basic' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('option', { name: 'single-choice' })
  ).toBeFocused();
  await expect(picks(page)).toHaveText('Picks');
  await page.keyboard.press('Enter');
  await expect(picks(page)).toHaveText('Picks single-choice');
});

test('a press picks, also the chosen option, never a disabled one', async ({
  page
}) => {
  await page.getByRole('option', { name: 'single-choice' }).click();
  await page.getByRole('option', { name: 'basic' }).click();
  await page.getByRole('option', { name: 'approval' }).click({ force: true });
  await expect(picks(page)).toHaveText('Picks single-choice,basic');
  await expect(
    page.getByRole('listbox', { name: 'Voting system' })
  ).toBeVisible();
});
