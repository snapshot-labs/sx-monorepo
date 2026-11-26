import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openStory(page: Page) {
  await page.goto('/iframe.html?id=ui-dropdown--default&viewMode=story');
  await page.waitForLoadState('networkidle');
  return page.getByRole('button', { name: 'Open menu' });
}

test('dropdown opens and closes with the keyboard', async ({ page }) => {
  const trigger = await openStory(page);
  const item = page.getByText('Item 1');

  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(item).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(item).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('dropdown closes on an outside click', async ({ page }) => {
  const trigger = await openStory(page);
  await trigger.click();
  await expect(page.getByText('Item 1')).toBeVisible();

  await page.mouse.click(10, 400);
  await expect(page.getByText('Item 1')).toBeHidden();
});

test('dropdown items run on click and Enter, not when disabled', async ({
  page
}) => {
  await page.goto('/iframe.html?id=ui-dropdown--with-items&viewMode=story');
  await page.waitForLoadState('networkidle');
  const trigger = page.getByRole('button', { name: 'Actions' });

  await trigger.click();
  await page.getByText('Edit').click();
  await expect(page.getByText('Clicked Edit')).toBeVisible();
  await expect(page.getByText('Delete')).toBeHidden();

  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Clicked Delete')).toBeVisible();

  await trigger.click();
  await page.getByText('Archive').click({ force: true });
  await expect(page.getByText('Clicked Delete')).toBeVisible();
});
