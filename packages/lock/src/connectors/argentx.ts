import Connector from './connector';

export default class Argentx extends Connector {
  async connect() {
    const { getTheme, ...options } = this.options;
    const modalTheme = getTheme?.() ?? 'light';

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
        { default: BrambleConnector }
      ] = await Promise.all([
        import('starknetkit'),
        import('starknetkit/injected'),
        import('starknetkit/webwallet'),
        import('./bramble')
      ]);
      const isSilent = !!localStorage.getItem('starknetLastConnectedWallet');
      const starknet = await starknetkit.connect({
        ...options,
        connectors: [
          // First, so it is listed above the install links: starknetkit only
          // moves the wallets it detects itself to the top.
          new BrambleConnector({ isSilent }),
          new InjectedConnector({ options: { id: 'argentX' } }),
          new InjectedConnector({ options: { id: 'braavos' } }),
          new WebWalletConnector()
        ],
        modalMode: isSilent ? 'neverAsk' : 'alwaysAsk',
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
