import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.waitForLoadState('networkidle');
}

test('tooltip opens on hover and closes when the pointer leaves', async ({
  page
}) => {
  await openStory(page, 'ui-tooltip--default');
  const tooltip = page.getByRole('tooltip');

  await page.getByText('Hover me').hover();
  await expect(tooltip).toHaveText('This is a tooltip');
  await expect(tooltip).toBeVisible();

  await page.mouse.move(700, 500);
  await expect(tooltip).toBeHidden();
});

test('tooltip adds no tab stop', async ({ page }) => {
  await openStory(page, 'ui-tooltip--default');
  await page.keyboard.press('Tab');
  const isOnTrigger = await page.evaluate(
    () => !!document.activeElement?.closest('[data-slot="tooltip-trigger"]')
  );
  expect(isOnTrigger).toBe(false);
});

test('tooltip on truncate only shows for cut off text', async ({ page }) => {
  await openStory(page, 'ui-tooltipontruncate--truncated');
  await page.locator('[data-slot="tooltip-trigger"]').hover();
  await expect(page.getByRole('tooltip')).toHaveText(
    'This is a very long text that will be truncated'
  );

  await openStory(page, 'ui-tooltipontruncate--not-truncated');
  await page.locator('[data-slot="tooltip-trigger"]').hover();
  await expect(page.getByRole('tooltip')).toBeHidden();
});
