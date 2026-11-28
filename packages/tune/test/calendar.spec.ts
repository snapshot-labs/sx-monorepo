import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00'));
  await page.goto('/iframe.html?id=ui-calendar--interactive&viewMode=story');
  await page.waitForLoadState('networkidle');
});

const day = (page: Page, label: string) =>
  page.getByRole('gridcell').filter({ hasText: new RegExp(`^${label}$`) });

test('a click picks the day as a timestamp', async ({ page }) => {
  await day(page, '18').click();
  const expected = Math.floor(new Date(2026, 10, 18).getTime() / 1000);
  await expect(page.locator('#picked')).toHaveText(`Picked ${expected}`);
});

test('days before the minimum can not be picked', async ({ page }) => {
  await day(page, '05').click({ force: true });
  await expect(page.locator('#picked')).toHaveText('Picked');
});

test('next month, then arrow keys and Enter', async ({ page }) => {
  await page.getByRole('button').last().click();
  await expect(page.getByRole('heading')).toHaveText('December 2026');
  await day(page, '01').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const expected = Math.floor(new Date(2026, 11, 2).getTime() / 1000);
  await expect(page.locator('#picked')).toHaveText(`Picked ${expected}`);
});
