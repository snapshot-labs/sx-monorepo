import { pin } from '@snapshot-labs/pineapple';
import { TransactionStatus } from 'starknet';
import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

export function createStarknetNetwork(networkId: NetworkID): Network {
  const l1ChainId = 5;

  const provider = createProvider();
  const api = createApi(constants.API_URL, networkId);

  const helpers = {
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
    waitForSpace: (spaceAddress: string, interval = 5000): Promise<Space> =>
      new Promise(resolve => {
        setInterval(async () => {
          const space = await api.loadSpace(spaceAddress);
          if (space) {
            resolve(space);
          }
        }, interval);
      }),
    getExplorerUrl: (id, type) => {
      let dataType: 'tx' | 'contract' = 'tx';
      if (['address', 'contract'].includes(type)) dataType = 'contract';

      return `https://testnet-2.starkscan.co/${dataType}/${id}`;
    }
  };

  return {
    name: 'Starknet (testnet2)',
    baseChainId: l1ChainId,
    baseNetworkId: 'gor',
    hasReceive: true,
    managerConnectors: ['argentx'],
    actions: createActions(provider, helpers, { l1ChainId }),
    api,
    constants,
    helpers
  };
}
