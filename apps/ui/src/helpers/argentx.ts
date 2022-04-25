const get = () =>
  import(/* webpackChunkName: "argentx" */ '@argent/get-starknet');
import LockConnector from '@snapshot-labs/lock/src/connector';

export default class Connector extends LockConnector {
  async connect() {
    let provider;
    try {
      const argentx = await get();
      const starknet = argentx.getStarknet();
      await starknet.enable({ showModal: true });
      if (!starknet.isConnected) return false;
      provider = starknet;
    } catch (e) {
      console.error(e);
    }
    provider.connectorName = 'argentx';
    return provider;
  }
}
