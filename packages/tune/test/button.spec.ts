import { expect, test } from '@playwright/test';

test('a pending async handler never blocks the next press', async ({
  page
}) => {
  await page.goto('/iframe.html?id=ui-button--interactive&viewMode=story');
  await page.waitForLoadState('networkidle');
  await page.locator('#slow').click();
  await page.locator('#slow').click();
  await page.locator('#off').click({ force: true });
  await expect(page.locator('#presses')).toHaveText('Presses 2');
  await expect(page.locator('#slow')).not.toHaveAttribute('data-pending');
});
