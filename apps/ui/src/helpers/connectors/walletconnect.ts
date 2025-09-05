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
const RECONNECT_TIMEOUT = 5000;

const awaitProvider = (
  appKit: AppKit,
  { isAutoConnect }: { isAutoConnect: boolean }
) =>
  new Promise((resolve, reject) => {
    appKit.subscribeEvents(event => {
      if (event.data.event === 'MODAL_CLOSE') reject('User closed modal');
    });

    appKit.subscribeProviders(state => {
      resolve(state['eip155']);
    });

    if (isAutoConnect) {
      setTimeout(() => {
        reject('Timeout');
      }, RECONNECT_TIMEOUT);
    }
  });

export default class Walletconnect extends Connector {
  private modal: AppKit | null = null;

  async connect(isAutoConnect = false) {
    const { currentTheme } = useTheme();

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
        apeChain,
        fantomTestnet,
        celo
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
          apeChain,
          fantomTestnet,
          celo
        ],
        themeMode: currentTheme.value,
        allWallets: 'ONLY_MOBILE',
        metadata,
        projectId
      });

      // This is needed in case the user changes the theme mode
      // otherwise modal will be opened with half light and half dark theme
      await this.modal.setThemeMode(currentTheme.value);

      if (!isAutoConnect) {
        await this.disconnect();

        await this.modal.open();
      }

      this.provider = await awaitProvider(this.modal, { isAutoConnect });

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

    await this.modal?.adapter?.connectionControllerClient?.disconnect();

    if (this.provider && 'disconnect' in this.provider) {
      try {
        // NOTE: This sometimes fails if we try to disconnect from 'disconnect' event
        // We need to handle this error so logout can safely continue
        await this.provider.disconnect();
      } catch {}

      this.provider = null;
    }

    await sleep(DISCONNECT_DELAY);
  }
}
