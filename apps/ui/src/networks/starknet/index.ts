import { createActions } from './actions';
import { createApi } from './api';
import { createProvider } from './provider';

export function createStarknetNetwork() {
  const provider = createProvider();

  return {
    actions: createActions(provider),
    api: createApi(),
    helpers: {
      waitForTransaction: txId => provider.waitForTransaction(txId),
      getTransactionLink: txId => `https://testnet-2.starkscan.co/tx/${txId}`
    }
  };
}
