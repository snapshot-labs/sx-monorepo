import { test as base, BrowserContext, chromium } from '@playwright/test';
import { MetaMaskHelper } from './helpers/metamask';

const METAMASK_SEED =
  process.env.METAMASK_SEED ||
  'test test test test test test test test test test test junk';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  wallet: MetaMaskHelper;
}>({
  context: async ({}, use) => {
    const pathToExtension = await MetaMaskHelper.downloadExtension();

    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`
      ]
    });

    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');

    const extensionId = serviceWorker.url().split('/')[2];

    if (!extensionId) {
      throw new Error('Extension ID not found');
    }

    await use(extensionId);
  },
  wallet: async ({ context, extensionId, headless }, use) => {
    const page = await context.waitForEvent('page', {
      predicate: page => MetaMaskHelper.isExtensionPage(page, extensionId)
    });

    await use(
      new MetaMaskHelper({
        page,
        context,
        extensionId,
        headless,
        seed: METAMASK_SEED
      })
    );
  }
});
export const expect = test.expect;
