import Connector from './connector';
const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');

export default class extends Connector {
  async connect() {
    const { currentMode } = useUserSkin();

    const userOptions = {
      modalMode: localStorage.getItem('starknetLastConnectedWallet')
        ? 'neverAsk'
        : 'alwaysAsk',
      modalTheme: currentMode.value
    };

    try {
      const argentx = await get();
      const starknet = await argentx.connect({
        ...this.options,
        ...userOptions
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
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    const argentx = await get();

    try {
      await argentx.disconnect({
        clearLastWallet: true
      });
    } catch (e) {
      console.error(e);
    }
  }
}
