import { test as base } from '@playwright/test';
import { ExplorePage, ProposalPage, ProposalsPage, SpacePage } from './poms';
export { expect } from '@playwright/test';

export const test = base.extend<{
  explorePage: ExplorePage;
  spacePage: SpacePage;
  proposalsPage: ProposalsPage;
  proposalPage: ProposalPage;
}>({
  explorePage: async ({ page }, use) => {
    const explorePage = new ExplorePage(page);
    await use(explorePage);
  },
  spacePage: async ({ page }, use) => {
    const spacePage = new SpacePage(page);
    await use(spacePage);
  },
  proposalsPage: async ({ page }, use) => {
    const proposalsPage = new ProposalsPage(page);
    await use(proposalsPage);
  },
  proposalPage: async ({ page }, use) => {
    const proposalPage = new ProposalPage(page);
    await use(proposalPage);
  }
});
