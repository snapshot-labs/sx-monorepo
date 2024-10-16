import LockConnector from '@snapshot-labs/lock/src/connector';
import { useUserSkin } from '@/composables/useUserSkin';
import { APP_NAME } from './constants';
const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');

const { currentMode } = useUserSkin();

export default class Connector extends LockConnector {
  async connect(): Promise<any> {
    let provider: any;

    try {
      const argentx = await get();
      const { wallet } = await argentx.connect({
        dappName: APP_NAME,
        modalMode: localStorage.getItem('starknetLastConnectedWallet')
          ? 'neverAsk'
          : 'alwaysAsk',
        modalTheme: currentMode.value,
        argentMobileOptions: {
          dappName: APP_NAME,
          url: 'https://snapshot.box',
          icons: ['https://snapshot.box/favicon.svg']
        }
      });

      if (!wallet) {
        throw Error(
          'User rejected wallet selection or silent connect found nothing'
        );
      }

      // @ts-ignore
      if (!wallet.isConnected) await wallet?.enable();

      provider = wallet;
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
