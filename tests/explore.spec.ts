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

test('should load space overview page', async ({ explorePage, spacePage }) => {
  await explorePage.goto();

  // Using dispatchEvent('click') instead of .click() to force click on the space link
  // instead of Follow button that we show on hover
  await explorePage.exploreSpacesList
    .getByRole('link', { name: /Arbitrum DAO/ })
    .dispatchEvent('click');

  await spacePage.isReady();
  await expect(spacePage.spaceName).toHaveText('Arbitrum DAO');
});
