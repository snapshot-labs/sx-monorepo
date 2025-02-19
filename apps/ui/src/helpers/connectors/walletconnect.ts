import { AppKit } from '@reown/appkit';
import Connector from './connector';

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
      const { EthersAdapter } = await import('@reown/appkit-adapter-ethers');
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

      this.modal ??= createAppKit({
        adapters: [new EthersAdapter()],
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
        features: {
          email: false,
          socials: false,
          analytics: false,
          onramp: false,
          swaps: false
        },
        themeMode: currentMode.value,
        metadata,
        projectId
      });

      if (!isAutoConnect) {
        this.disconnect();

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
    this.modal?.disconnect();

    if (this.provider && 'disconnect' in this.provider) {
      this.provider.disconnect();
      this.provider = null;
    }
  }
}
