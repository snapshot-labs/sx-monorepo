import { expect, Locator, Page } from '@playwright/test';

export class ExplorePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly exploreSpacesList: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Search for a space');
    this.exploreSpacesList = page.getByTestId('explore-spaces-list');
    this.loadingIndicator = page.getByTestId('loading-indicator');
  }

  async goto() {
    await this.page.goto('/#/explore');
  }

  async search(query: string) {
    await this.searchInput.click();
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async clearSearch() {
    await this.searchInput.click();
    await this.searchInput.clear();
    await this.searchInput.press('Enter');
  }

  async selectProtocol(protocolName: 'Snapshot' | 'Snapshot X') {
    await this.page.getByRole('button', { name: 'Protocol' }).click();
    await this.page
      .getByRole('menuitem', { name: protocolName, exact: true })
      .click();
  }

  async selectNetwork(name: string) {
    await this.page.getByRole('combobox', { name: 'Network' }).click();
    await this.page.getByRole('combobox', { name: 'Network' }).fill(name);
    await this.page.getByText(name).click();
  }

  async isSpaceVisible(name: string) {
    return expect(
      this.exploreSpacesList.getByRole('link', { name }).first()
    ).toBeVisible();
  }

  async isNoResultsVisible() {
    return expect(
      this.exploreSpacesList.getByText('No results found for your search')
    ).toBeVisible();
  }

  async isLoading() {
    return expect(this.loadingIndicator).toBeVisible();
  }

  async isNotLoading() {
    return expect(this.loadingIndicator).not.toBeVisible();
  }
}

export class SpacePage {
  readonly page: Page;
  readonly spaceName: Locator;
  readonly summaryProposalsList: Locator;
  readonly summaryProposals: Locator;
  readonly seeMoreLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.spaceName = page.getByTestId('space-name');
    this.summaryProposalsList = page.getByTestId('summary-proposals-list');
    this.summaryProposals =
      this.summaryProposalsList.getByTestId('proposal-list-item');
    this.seeMoreLink = this.summaryProposalsList.getByRole('link', {
      name: 'See more'
    });
  }

  async goto(spaceId: string) {
    await this.page.goto(`/#/${spaceId}`);
  }
}

export class ProposalsPage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Search for a proposal');
  }

  async goto(spaceId: string) {
    await this.page.goto(`/#/${spaceId}/proposals`);
  }

  async isReady() {
    return expect(
      this.page.getByRole('heading', { name: 'Proposals', exact: true })
    ).toBeVisible();
  }

  async selectStatus(status: 'Any' | 'Pending' | 'Active' | 'Closed') {
    await this.page.getByRole('button', { name: 'Status' }).click();
    await this.page.getByRole('menuitem', { name: status }).click();
  }

  async searchProposal(query: string) {
    await this.searchInput.click();
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }
}

export class ProposalPage {
  readonly page: Page;
  readonly tabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tabs = page.getByTestId('proposal-tabs');
  }

  async goto(spaceId: string, proposalId: string) {
    await this.page.goto(`/#/${spaceId}/proposal/${proposalId}`);
  }

  async isReady() {
    return expect(this.tabs).toBeVisible();
  }

  async selectTab(tabName: 'Votes' | 'Discussion') {
    let locator = this.tabs.getByRole('link', { name: tabName });

    if (tabName === 'Discussion') {
      // Before topic is loaded it's external link to Discourse.
      // Once Topic is loaded it becomes an internal link to our UI.
      // We need to wait for the link to become internal.
      locator = locator.and(this.tabs.locator('[href^="#"]'));
    }

    await locator.click();
  }
}
