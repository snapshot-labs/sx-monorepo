import { expect, test } from './fixtures/base';

test('should load space overview page', async ({
  spacePage,
  proposalsPage
}) => {
  await spacePage.goto('s:arbitrumfoundation.eth');

  await expect(spacePage.spaceName).toHaveText('Arbitrum DAO');
  await expect(spacePage.summaryProposalsList).toBeVisible();
  await expect(spacePage.seeMoreLink).toBeVisible();

  const proposals = await spacePage.summaryProposals.all();
  expect(proposals).toHaveLength(5);

  await spacePage.seeMoreLink.click();

  await proposalsPage.isReady();
});

test('should navigate to proposal page', async ({
  page,
  proposalsPage,
  proposalPage
}) => {
  await proposalsPage.goto('s:arbitrumfoundation.eth');

  await proposalsPage.selectStatus('Closed');
  await proposalsPage.searchProposal('Updating the Code of Conduct');

  await page
    .getByRole('link', { name: 'Updating the Code of Conduct' })
    .click();

  await proposalPage.isReady();
});

test('should load votes and vote reason', async ({
  page,
  proposalPage,
  modalHelper
}) => {
  await proposalPage.goto(
    's:arbitrumfoundation.eth',
    '0xd3d164905fee7dfd8516db6150a97f7f91cf6f9377f614fa6a82333c4fb20546'
  );

  await proposalPage.selectTab('Votes');
  await expect(page.getByRole('link', { name: 'LobbyFi' })).toBeVisible();

  await page.getByRole('button', { name: 'Abstain Democratising' }).click();

  await modalHelper.isReady();
  await expect(
    modalHelper.header.getByRole('heading', { name: 'Reason' })
  ).toBeVisible();
  await expect(
    modalHelper.body.getByText('Democratising lobbyism, on-chain. Check out')
  ).toBeVisible();

  await modalHelper.close();
});

test('should load discussion', async ({ page, proposalPage }) => {
  await proposalPage.goto(
    's:arbitrumfoundation.eth',
    '0xd3d164905fee7dfd8516db6150a97f7f91cf6f9377f614fa6a82333c4fb20546'
  );

  await proposalPage.selectTab('Discussion');

  await expect(
    page.getByRole('button', { name: 'Join the discussion' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Updating the Code of Conduct' })
  ).toBeVisible();
});
