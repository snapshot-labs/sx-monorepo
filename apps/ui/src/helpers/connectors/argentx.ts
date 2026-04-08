import Connector from './connector';
const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');
const getInjected = () =>
  import(/* webpackChunkName: "argentx" */ 'starknetkit/injected');
const getWebwallet = () =>
  import(/* webpackChunkName: "argentx" */ 'starknetkit/webwallet');

export default class Argentx extends Connector {
  async connect() {
    const { currentTheme } = useTheme();

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
        ...this.options,
        connectors: [
          new InjectedConnector({ options: { id: 'argentX' } }),
          new InjectedConnector({ options: { id: 'braavos' } }),
          new WebWalletConnector()
        ],
        modalMode: localStorage.getItem('starknetLastConnectedWallet')
          ? 'neverAsk'
          : 'alwaysAsk',
        modalTheme: currentTheme.value
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
