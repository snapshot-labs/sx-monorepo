import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.waitForLoadState('networkidle');
}

const dialog = (page: Page, name: string) => page.getByRole('dialog', { name });

test.describe('interactive', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'ui-modal--interactive');
    await page.locator('#open').click();
    await expect(dialog(page, 'Delegate')).toBeVisible();
  });

  test('Escape closes it and focus goes back', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'Delegate')).toHaveCount(0);
    await expect(page.locator('#open')).toBeFocused();
  });

  test('the close button closes it', async ({ page }) => {
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(dialog(page, 'Delegate')).toHaveCount(0);
  });

  test('the backdrop closes it, a click inside does not', async ({ page }) => {
    // On phones the modal covers the backdrop
    test.skip(test.info().project.name === 'phone');
    await page.getByText('Delegate').click();
    await expect(dialog(page, 'Delegate')).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog(page, 'Delegate')).toHaveCount(0);
  });

  test('Escape closes only the modal on top', async ({ page }) => {
    await page.locator('#open-nested').click();
    await expect(dialog(page, 'Log in')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'Log in')).toHaveCount(0);
    await expect(dialog(page, 'Delegate')).toBeVisible();
    await expect(page.locator('#open-nested')).toBeFocused();
  });

  test('Tab stays inside the modal', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      await expect(page.locator('#open')).not.toBeFocused();
    }
  });
});

test('a modal that is not closeable stays open', async ({ page }) => {
  await openStory(page, 'ui-modal--not-closeable');
  await expect(dialog(page, 'Delegate')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close modal' })).toHaveCount(
    0
  );
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await expect(dialog(page, 'Delegate')).toBeVisible();
});
