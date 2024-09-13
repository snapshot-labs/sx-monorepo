const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');
import LockConnector from '@snapshot-labs/lock/src/connector';

export default class Connector extends LockConnector {
  async connect() {
    let provider;
    try {
      const argentx = await get();
      const starknet = await argentx.connect({
        dappName: 'Snapshot',
        modalMode: localStorage.getItem('starknetLastConnectedWallet')
          ? 'neverAsk'
          : 'alwaysAsk',
        modalTheme:
          (localStorage.getItem('skin') as 'light' | 'dark') || 'system',
        argentMobileOptions: {
          dappName: 'Snapshot',
          url: 'https://snapshot.box',
          icons: ['https://snapshot.box/favicon.svg']
        }
      });

      if (!starknet.wallet) {
        throw Error(
          'User rejected wallet selection or silent connect found nothing'
        );
      }

      if (!starknet.wallet.isConnected) {
        throw new Error('Connector was not connected');
      }

      provider = starknet.wallet;
      provider.connectorName = 'argentx';
      return provider;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async logout() {
    const argentx = await get();
    await argentx.disconnect({
      clearLastWallet: true
    });
  }
}
