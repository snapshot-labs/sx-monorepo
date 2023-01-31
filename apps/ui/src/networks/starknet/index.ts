import { pin } from '@snapshot-labs/pineapple';
import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import type { Network } from '@/networks/types';
import type { NetworkID } from '@/types';

export function createStarknetNetwork(networkId: NetworkID): Network {
  const provider = createProvider();

  return {
    hasRelayer: true,
    hasReceive: true,
    actions: createActions(provider),
    api: createApi(constants.API_URL, networkId),
    constants,
    helpers: {
      pin: async (content: any) => {
        const pinned = await pin(content);
        if (!pinned) throw new Error('Failed to pin');

        return {
          provider: pinned.provider,
          cid: pinned.cid
        };
      },
      waitForTransaction: txId =>
        provider.waitForTransaction(txId, ['ACCEPTED_ON_L1', 'ACCEPTED_ON_L2']),
      getTransactionLink: txId => `https://testnet-2.starkscan.co/tx/${txId}`
    }
  };
}
