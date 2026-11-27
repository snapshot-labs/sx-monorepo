import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/iframe.html?id=ui-reorderlist--default&viewMode=story');
  await page.waitForLoadState('networkidle');
});

async function drag(page: Page, from: string, to: string) {
  const [a, b] = await Promise.all([
    page.locator(from).boundingBox(),
    page.locator(to).boundingBox()
  ]);
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(a!.x + a!.width / 2, b!.y + b!.height - 2, {
    steps: 12
  });
  await page.mouse.up();
}

test('dragging a handle moves the item', async ({ page }) => {
  await drag(
    page,
    '[aria-label="Move Ethereum"]',
    '[data-slot=reorder-list] span:has-text("Arbitrum")'
  );
  await expect(page.locator('#value')).toHaveText(
    'Value Base,Arbitrum,Ethereum'
  );
});

test('dragging outside the handle does nothing', async ({ page }) => {
  await drag(
    page,
    '[data-slot=reorder-list] span:has-text("Ethereum")',
    '[data-slot=reorder-list] span:has-text("Arbitrum")'
  );
  await expect(page.locator('#value')).toHaveText(
    'Value Ethereum,Base,Arbitrum'
  );
});

test('the keyboard moves an item', async ({ page }) => {
  await page.locator('[aria-label="Move Base"]').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('#value')).toHaveText(
    'Value Base,Ethereum,Arbitrum'
  );
});

test('Escape puts a picked up item back', async ({ page }) => {
  await page.locator('[aria-label="Move Base"]').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.locator('#value')).toHaveText(
    'Value Ethereum,Base,Arbitrum'
  );
});

test('items keyed by objects move too', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-reorderlist--objects&viewMode=story');
  await page.waitForLoadState('networkidle');
  await page.locator('[aria-label="Move Carol"]').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Home');
  await page.keyboard.press('Space');
  await expect(page.locator('#value')).toHaveText('Value Carol,Alice,Bob');
});
