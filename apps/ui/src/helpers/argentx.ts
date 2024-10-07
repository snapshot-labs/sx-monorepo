import LockConnector from '@snapshot-labs/lock/src/connector';
import { useUserSkin } from '@/composables/useUserSkin';
const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');

const { currentMode } = useUserSkin();

export default class Connector extends LockConnector {
  async connect(): Promise<any> {
    try {
      const argentx = await get();
      const { wallet } = await argentx.connect({
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

      if (!wallet) {
        throw Error(
          'User rejected wallet selection or silent connect found nothing'
        );
      }

      // @ts-ignore
      await wallet?.enable();

      // @ts-ignore
      if (!wallet.isConnected) {
        throw new Error('Connector was not connected');
      }

      return {
        ...wallet,
        connectorName: 'argentx'
      };
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
