import Connector from './connector';
const get = (): Promise<any> =>
  import(/* webpackChunkName: "argentx" */ 'starknetkit');
const getInjected = (): Promise<any> =>
  import(/* webpackChunkName: "argentx" */ 'starknetkit/injected');
const getWebwallet = (): Promise<any> =>
  import(/* webpackChunkName: "argentx" */ 'starknetkit/webwallet');

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

      const [argentx, { InjectedConnector }, { WebWalletConnector }] =
        await Promise.all([get(), getInjected(), getWebwallet()]);
      const starknet = await argentx.connect({
        ...options,
        connectors: [
          new InjectedConnector({ options: { id: 'argentX' } }),
          new InjectedConnector({ options: { id: 'braavos' } }),
          new WebWalletConnector()
        ],
        modalMode: localStorage.getItem('starknetLastConnectedWallet')
          ? 'neverAsk'
          : 'alwaysAsk',
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
    const argentx = await get();

    try {
      await argentx.disconnect({
        clearLastWallet: true
      });
    } catch (err) {
      console.error(err);
    }
  }
}
