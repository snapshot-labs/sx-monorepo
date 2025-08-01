import { expect, test } from './fixtures/base';

test('should have functional search page', async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.isSpaceVisible('Arbitrum DAO');

  await explorePage.search('nosuchspacenosuchspacenosuchspacedummy');
  await explorePage.isNoResultsVisible();

  await explorePage.clearSearch();
  await explorePage.isSpaceVisible('Arbitrum DAO');

  await explorePage.search('Fabien');
  await explorePage.isSpaceVisible('Fabien');
});

test('should be able to switch to Snapshot X protocol', async ({
  explorePage
}) => {
  await explorePage.goto();

  await explorePage.selectProtocol('Snapshot X');
  await explorePage.isSpaceVisible('Nimbora');

  await explorePage.selectNetwork('Base');
  await explorePage.isSpaceVisible('GRQ DAO');
});

test('should fetch more spaces on scroll', async ({ page, explorePage }) => {
  await explorePage.goto();

  await explorePage.isNotLoading();
  const initialSpaces = await explorePage.exploreSpacesList
    .getByRole('link')
    .all();

  await page.mouse.wheel(0, 5000);

  await explorePage.isLoading();
  await explorePage.isNotLoading();

  const spacesAfterScroll = await explorePage.exploreSpacesList
    .getByRole('link')
    .all();
  expect(spacesAfterScroll.length).toBeGreaterThan(initialSpaces.length);
});
