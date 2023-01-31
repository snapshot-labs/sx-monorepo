import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import { pinGraph } from '@/helpers/graph';
import type { Network } from '@/networks/types';
import type { NetworkID } from '@/types';

export function createEvmNetwork(networkId: NetworkID): Network {
  const provider = createProvider('https://rpc.brovider.xyz/5');

  return {
    hasRelayer: false,
    hasReceive: false,
    actions: createActions(),
    api: createApi(constants.API_URL, networkId),
    constants,
    helpers: {
      pin: pinGraph,
      waitForTransaction: txId => provider.waitForTransaction(txId),
      getTransactionLink: txId => `https://goerli.etherscan.io/tx/${txId}`
    }
  };
}
