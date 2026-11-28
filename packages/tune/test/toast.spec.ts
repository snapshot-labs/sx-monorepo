import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const alert = (page: Page, text: string) =>
  page.getByRole('region', { name: 'Notifications' }).getByText(text);

test.beforeEach(async ({ page }) => {
  await page.goto('/iframe.html?id=ui-toaster--default&viewMode=story');
  await page.waitForLoadState('networkidle');
});

test('shows toasts, newest at the bottom', async ({ page }) => {
  await page.locator('#success').click();
  await page.locator('#warning').click();
  const [first, second] = [
    alert(page, 'Link copied.'),
    alert(page, 'Some voting strategies')
  ];
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  expect(b!.y).toBeGreaterThan(a!.y);
});

test('the close button dismisses without taking focus', async ({ page }) => {
  await page.locator('#error').click();
  await page.locator('#success').click();
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Link copied.' })
    .getByRole('button')
    .click();
  await expect(alert(page, 'Link copied.')).toHaveCount(0);
  await expect(alert(page, 'could not be created')).toBeVisible();
  // focus stays on the button that opened it, so the other timers run
  await expect(page.locator('#success')).toBeFocused();
});

test('a toast leaves after its duration', async ({ page }) => {
  await page.locator('#short').click();
  await expect(alert(page, 'Link copied.')).toBeVisible();
  await expect(alert(page, 'Link copied.')).toHaveCount(0);
});
