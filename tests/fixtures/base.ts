import { test as base } from './metamask';
import {
  AuthPage,
  ExplorePage,
  ModalHelper,
  ProposalPage,
  ProposalsPage,
  SpacePage
} from './poms';
export { expect } from '@playwright/test';

export const test = base.extend<{
  authPage: AuthPage;
  explorePage: ExplorePage;
  spacePage: SpacePage;
  proposalsPage: ProposalsPage;
  proposalPage: ProposalPage;
  modalHelper: ModalHelper;
}>({
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },
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
  },
  modalHelper: async ({ page }, use) => {
    const modalHelper = new ModalHelper(page);
    await use(modalHelper);
  }
});
