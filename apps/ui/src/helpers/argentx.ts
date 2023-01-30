const get = () => import(/* webpackChunkName: "argentx" */ '@argent/get-starknet');
import LockConnector from '@snapshot-labs/lock/src/connector';

export default class Connector extends LockConnector {
  async connect() {
    let provider;
    try {
      const argentx = await get();
      const starknet = await argentx.connect();

      if (!starknet) {
        throw Error('User rejected wallet selection or silent connect found nothing');
      }

      await starknet.enable({ showModal: true });

      if (!starknet.isConnected) {
        throw new Error('Connector was not connected');
      }

      provider = starknet;
      provider.connectorName = 'argentx';
      return provider;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
