import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.waitForLoadState('networkidle');
}

const options = (page: Page) => page.getByRole('option');

test.describe('combobox', () => {
  test.beforeEach(({ page }) => openStory(page, 'ui-combobox--interactive'));

  test('filters and picks with Enter', async ({ page }) => {
    const input = page.getByRole('combobox');
    await expect(input).toHaveValue('Base');

    await input.click();
    await expect(options(page)).toHaveCount(3);
    // the label is selected on focus, so typing replaces it
    await page.keyboard.type('eth');
    await expect(options(page)).toHaveText(['Ethereum']);

    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Ethereum');
    await expect(page.getByText('Value 1')).toBeVisible();
    await expect(options(page)).toHaveCount(0);
  });

  test('shows no results, and Escape restores the label', async ({ page }) => {
    const input = page.getByRole('combobox');
    await input.click();
    await page.keyboard.type('zzz');
    await expect(page.getByText('No results for your search')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(input).toHaveValue('Base');
    await expect(page.getByText('Value 8453')).toBeVisible();
  });

  test('clicking the input opens the list', async ({ page }) => {
    await page.getByRole('combobox').click();
    await expect(options(page)).toHaveCount(3);
  });

  test('clearing the input selects nothing', async ({ page }) => {
    await page.getByRole('combobox').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await expect(page.getByText('Value null')).toBeVisible();
  });
});

test('combobox follows a value set from outside and late options', async ({
  page
}) => {
  await openStory(page, 'ui-combobox--external-changes');
  const [input, late] = [
    page.getByRole('combobox', { name: 'Network' }),
    page.getByRole('combobox', { name: 'Late' })
  ];
  await expect(input).toHaveValue('Base');
  await expect(late).toHaveValue('Arbitrum');

  await page.locator('#set-ethereum').click();
  await expect(input).toHaveValue('Ethereum');
  await page.locator('#set-null').click();
  await expect(input).toHaveValue('');
});

test.describe('select multiple', () => {
  test.beforeEach(({ page }) =>
    openStory(page, 'ui-selectmultiple--interactive')
  );

  test('toggles options and disables the rest at the limit', async ({
    page
  }) => {
    await page.getByRole('combobox', { name: 'Networks' }).click();
    await page.getByRole('option', { name: 'Base' }).click();
    await expect(page.getByText('Value eth,base')).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Arbitrum' })
    ).toHaveAttribute('aria-disabled', 'true');

    await page.getByRole('option', { name: 'Ethereum' }).click();
    await expect(page.getByText('Value base')).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Arbitrum' })
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('works with the keyboard', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Networks' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox', { name: 'Networks' })).toBeVisible();
    await expect(options(page)).toHaveCount(3);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press(' ');
    await expect(page.getByText('Value eth,base')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(options(page)).toHaveCount(0);
  });
});
