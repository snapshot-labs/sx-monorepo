import { pin } from '@snapshot-labs/pineapple';
import { TransactionStatus } from 'starknet';
import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import type { Network } from '@/networks/types';
import type { NetworkID } from '@/types';

export function createStarknetNetwork(networkId: NetworkID): Network {
  const l1ChainId = 5;

  const provider = createProvider();

  return {
    name: 'Starknet (testnet2)',
    hasRelayer: true,
    hasReceive: true,
    managerConnectors: ['argentx'],
    actions: createActions(provider, { l1ChainId }),
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
        provider.waitForTransaction(txId, {
          successStates: [TransactionStatus.ACCEPTED_ON_L1, TransactionStatus.ACCEPTED_ON_L2]
        }),
      getExplorerUrl: (id, type) => {
        let dataType: 'tx' | 'contract' = 'tx';
        if (['address', 'contract'].includes(type)) dataType = 'contract';

        return `https://testnet-2.starkscan.co/${dataType}/${id}`;
      }
    }
  };
}
