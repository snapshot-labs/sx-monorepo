import fs from 'fs/promises';
import path from 'path';
import test, { BrowserContext, Page } from '@playwright/test';
import decompress from 'decompress';

const METAMASK_VERSION = '12.23.1';

const BASE_PATH = path.join(path.resolve(), '.browser');
const EXTENSION_PATH = path.join(
  BASE_PATH,
  `metamask-chrome-${METAMASK_VERSION}`
);

export class MetaMaskHelper {
  private page: Page;
  private context: BrowserContext;
  private extensionId: string;
  private headless: boolean;
  private seed: string;

  constructor({
    page,
    context,
    extensionId,
    headless,
    seed
  }: {
    page: Page;
    context: BrowserContext;
    extensionId: string;
    headless: boolean;
    seed: string;
  }) {
    this.page = page;
    this.context = context;
    this.extensionId = extensionId;
    this.headless = headless;
    this.seed = seed;
  }

  static async checkIfExists() {
    try {
      await fs.access(EXTENSION_PATH);

      return true;
    } catch {
      return false;
    }
  }

  static async downloadExtension() {
    if (process.env.TEST_PARALLEL_INDEX !== '0') {
      while (true) {
        const extensionExists = await this.checkIfExists();
        if (extensionExists) return EXTENSION_PATH;

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const extensionExists = await this.checkIfExists();
    if (extensionExists) {
      return EXTENSION_PATH;
    }

    console.log('MetaMask extension not found, downloading...');

    const downloadUrl = `https://github.com/MetaMask/metamask-extension/releases/download/v${METAMASK_VERSION}/metamask-chrome-${METAMASK_VERSION}.zip`;
    const zipPath = path.join(BASE_PATH, 'metamask.zip');
    const browserDir = path.dirname(EXTENSION_PATH);

    await fs.mkdir(browserDir, { recursive: true });

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download MetaMask extension: ${response.statusText}`
      );
    }
    const buffer = await response.arrayBuffer();
    await fs.writeFile(zipPath, Buffer.from(buffer));

    await decompress(zipPath, EXTENSION_PATH);

    await fs.unlink(zipPath);

    console.log('MetaMask extension downloaded and extracted.');

    return EXTENSION_PATH;
  }

  static isExtensionPage(page: Page, extensionId: string): boolean {
    return page.url().includes(`chrome-extension://${extensionId}`);
  }

  async importSeed() {
    return test.step('MetaMask - Import seed', async () => {
      await this._importSeed();
    });
  }

  async approveConnection() {
    return test.step('MetaMask - Approve connection', async () => {
      await this._approveConnection();
    });
  }

  private async _importSeed() {
    await this.page.getByRole('button', { name: 'Get Started' }).click();

    await this.page.getByTestId('terms-of-use-scroll-button').click();

    await this.page
      .getByRole('checkbox', { name: 'I agree to the terms of use' })
      .check();

    await this.page.getByRole('button', { name: 'Agree' }).click();

    // Importing seed
    await this.page
      .getByRole('button', { name: 'Import using secret recovery phrase' })
      .click();

    await this.page.getByRole('textbox').pressSequentially(this.seed);

    await this.page.getByRole('button', { name: 'Continue' }).click();

    // Setting up password
    await this.page
      .getByRole('textbox', { name: 'Create new password' })
      .fill('somepassword');

    await this.page
      .getByRole('textbox', { name: 'Confirm password' })
      .fill('somepassword');

    await this.page.getByRole('checkbox').check();

    await this.page.getByRole('button', { name: 'Create password' }).click();

    // Telemetry
    await this.page.getByRole('button', { name: 'No thanks' }).click();

    // Final step
    await this.page.getByRole('button', { name: 'Done' }).click();

    // Another final step
    await this.page.getByRole('button', { name: 'Done' }).click();

    // Dismiss solana
    await this.page.getByRole('button', { name: 'Not now' }).click();

    await this.page.close();
  }

  private async _getNotificationPopup() {
    let page = this.context
      .pages()
      .find(page => MetaMaskHelper.isExtensionPage(page, this.extensionId));

    if (!page) {
      if (this.headless) {
        page = await this.context.newPage();
        await page.goto(
          `chrome-extension://${this.extensionId}/notification.html`
        );
      } else {
        page = await this.context.waitForEvent('page', {
          predicate: p => MetaMaskHelper.isExtensionPage(p, this.extensionId)
        });
      }
    }

    return {
      page,
      close: async () => {
        if (this.headless) {
          return page.close();
        }

        return page.waitForEvent('close');
      }
    };
  }

  private async _approveConnection() {
    const { page, close } = await this._getNotificationPopup();

    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Connect' }).click();

    await close();
  }
}
