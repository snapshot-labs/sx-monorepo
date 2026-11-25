import { createBrambleConnector } from './bramble';
import Connector from './connector';

export default class Argentx extends Connector {
  async connect() {
    const { getTheme, getRpcUrl, ...options } = this.options;
    const modalTheme = getTheme?.() ?? 'light';

    const isSilentReconnect = !!localStorage.getItem(
      'starknetLastConnectedWallet'
    );

    try {
      const injected = (window as any).starknet_argentX;
      if (injected?.isInAppBrowser) {
        await injected.enable();
        this.provider = injected;

        return;
      }

      const [
        starknetkit,
        { InjectedConnector },
        { WebWalletConnector },
        bramble
      ] = await Promise.all([
        import('starknetkit'),
        import('starknetkit/injected'),
        import('starknetkit/webwallet'),
        createBrambleConnector({
          getRpcUrl,
          canOpenInstallPage: !isSilentReconnect
        })
      ]);
      const starknet = await starknetkit.connect({
        ...options,
        connectors: [
          new InjectedConnector({ options: { id: 'argentX' } }),
          new InjectedConnector({ options: { id: 'braavos' } }),
          bramble,
          new WebWalletConnector()
        ],
        modalMode: isSilentReconnect ? 'neverAsk' : 'alwaysAsk',
        modalTheme
      });

      if (!starknet.wallet) {
        throw Error(
          'User rejected wallet selection or silent connect found nothing'
        );
      }

      if (!starknet.wallet.isConnected) {
        throw new Error('Connector was not connected');
      }

      this.provider = starknet.wallet;
    } catch (err) {
      console.error(err);
    }
  }

  async disconnect() {
    const starknetkit = await import('starknetkit');

    try {
      await starknetkit.disconnect({
        clearLastWallet: true
      });
    } catch (err) {
      console.error(err);
    }
  }
}
