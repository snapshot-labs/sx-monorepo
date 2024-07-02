const get = () => import(/* webpackChunkName: "argentx" */ 'starknetkit');
import LockConnector from '@snapshot-labs/lock/src/connector';

export default class Connector extends LockConnector {
  async logout() {
    const argentx = await get();
    await argentx.disconnect({
      clearLastWallet: true
    });
  }

  async connect() {
    let provider;
    try {
      const argentx = await get();
      const starknet = await argentx.connect();

      if (!starknet.wallet) {
        throw Error('User rejected wallet selection or silent connect found nothing');
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
}
