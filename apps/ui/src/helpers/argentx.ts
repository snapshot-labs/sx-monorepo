import LockConnector from '@snapshot-labs/lock/src/connector';
import { useUserSkin } from '@/composables/useUserSkin';
const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');

const { currentMode } = useUserSkin();

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
        modalTheme: currentMode.value,
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

    try {
      await argentx.disconnect({
        clearLastWallet: true
      });
    } catch (e) {
      console.log(e);
    }
  }
}
