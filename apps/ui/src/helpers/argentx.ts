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

      // @ts-ignore starknetVersion is expected by ArgentX, v3 won't work with new transactions
      await starknet.enable({ showModal: true, starknetVersion: 'v4' });

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
