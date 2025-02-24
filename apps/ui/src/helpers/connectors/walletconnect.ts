import { AppKit } from '@reown/appkit';
import Connector from './connector';
import { sleep } from '../utils';

/**
 * Delay before and after disconnecting from WalletConnect.
 * AppKit is event based and we can't await the disconnect method.
 * It also doesn't expose enough data (via getters and events) for us
 * to know when it's safe to disconnect nor when it's done disconnecting.
 * Awaiting for state.initialized isn't enough.
 * Adding a delay was the most reliable way to handle this.
 */
const DISCONNECT_DELAY = 1000;

const awaitProvider = (appKit: AppKit) =>
  new Promise((resolve, reject) => {
    appKit.subscribeEvents(event => {
      if (event.data.event === 'MODAL_CLOSE') reject('User closed modal');
    });

    appKit.subscribeProviders(state => {
      resolve(state['eip155']);
    });
  });

export default class Walletconnect extends Connector {
  private modal: AppKit | null = null;

  async connect(isAutoConnect = false) {
    const { currentMode } = useUserSkin();

    try {
      const { createAppKit } = await import('@reown/appkit');
      const {
        mainnet,
        optimism,
        bsc,
        gnosis,
        sonic,
        fantom,
        base,
        arbitrum,
        polygon,
        metis,
        sepolia,
        fantomTestnet
      } = await import('@reown/appkit/networks');

      const { projectId, ...metadata } = this.options;

      this.modal = createAppKit({
        networks: [
          mainnet,
          optimism,
          bsc,
          gnosis,
          sonic,
          fantom,
          base,
          arbitrum,
          polygon,
          metis,
          sepolia,
          fantomTestnet
        ],
        themeMode: currentMode.value,
        allWallets: 'HIDE',
        metadata,
        projectId
      });

      // This is needed in case the user changes the theme mode
      // otherwise modal will be opened with half light and half dark theme
      await this.modal.setThemeMode(currentMode.value);

      if (!isAutoConnect) {
        await this.disconnect();

        await this.modal.open();
      }

      this.provider = await awaitProvider(this.modal);

      this.modal.close();
    } catch (e) {
      console.error(e);
    }
  }

  autoConnect(): Promise<void> {
    return this.connect(true);
  }

  async disconnect() {
    await sleep(DISCONNECT_DELAY);

    await this.modal?.disconnect();

    if (this.provider && 'disconnect' in this.provider) {
      this.provider.disconnect();
      this.provider = null;
    }

    await sleep(DISCONNECT_DELAY);
  }
}
