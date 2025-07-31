import { expect, test } from '@playwright/test';

test('should have functional search page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Arbitrum DAO' })).toBeVisible();

  const searchBox = page.getByPlaceholder('Search for a space');

  await searchBox.click();
  await searchBox.fill('nosuchspacenosuchspacenosuchspacedummy');
  await searchBox.press('Enter');

  await expect(
    page.getByText('No results found for your search')
  ).toBeVisible();

  await searchBox.click();
  await searchBox.clear();
  await searchBox.press('Enter');

  await expect(page.getByRole('link', { name: 'Arbitrum DAO' })).toBeVisible();

  await searchBox.click();
  await searchBox.fill('Fabien');
  await searchBox.press('Enter');

  await expect(
    page.getByRole('link', { name: 'Fabien' }).first()
  ).toBeVisible();
});

test('should be able to switch to Snapshot X protocol', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Protocol' }).click();
  await page.getByRole('menuitem', { name: 'Snapshot X' }).click();

  await expect(page.getByRole('link', { name: 'Nimbora' })).toBeVisible();

  await page.getByRole('combobox', { name: 'All networks' }).click();
  await page.getByRole('option', { name: 'Base' }).click();

  await expect(page.getByRole('link', { name: 'GRQ DAO' })).toBeVisible();
});

test('should fetch more spaces on scroll', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Arbitrum DAO' })).toBeVisible();

  const exploreSpacesList = page.getByTestId('explore-spaces-list');

  const initialSpaces = await exploreSpacesList.getByRole('link').all();

  await page.mouse.wheel(0, 5000);

  await expect(
    exploreSpacesList.getByTestId('loading-indicator')
  ).toBeVisible();

  await expect(
    exploreSpacesList.getByTestId('loading-indicator')
  ).not.toBeVisible();

  const spacesAfterScroll = await exploreSpacesList.getByRole('link').all();
  expect(spacesAfterScroll.length).toBeGreaterThan(initialSpaces.length);
});
