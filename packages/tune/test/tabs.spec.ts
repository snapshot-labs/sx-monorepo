import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/iframe.html?id=ui-tabs--default&viewMode=story');
  await page.waitForLoadState('networkidle');
});

test('a click selects a tab and keeps number values', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await page.getByRole('tab', { name: 'Votes' }).click();
  await expect(page.getByRole('tab', { name: 'Votes' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.locator('#value')).toHaveText('Value 1 (number)');
});

test('arrow keys move between tabs', async ({ page }) => {
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Execution' })).toBeFocused();
  await expect(page.locator('#value')).toHaveText('Value 2 (number)');
  await expect(page.getByRole('tablist', { name: 'Proposal' })).toBeVisible();
});
