import { TransactionStatus } from 'starknet';
import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import { pinPineapple } from '@/helpers/pin';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

export function createStarknetNetwork(networkId: NetworkID): Network {
  const l1ChainId = 5;

  const provider = createProvider();
  const api = createApi(constants.API_URL, networkId);

  const helpers = {
    pin: pinPineapple,
    waitForTransaction: txId =>
      provider.waitForTransaction(txId, {
        successStates: [TransactionStatus.ACCEPTED_ON_L1, TransactionStatus.ACCEPTED_ON_L2]
      }),
    waitForSpace: (spaceAddress: string, interval = 5000): Promise<Space> =>
      new Promise(resolve => {
        const timer = setInterval(async () => {
          const space = await api.loadSpace(spaceAddress);
          if (space) {
            clearInterval(timer);
            resolve(space);
          }
        }, interval);
      }),
    getExplorerUrl: (id, type) => {
      let dataType: 'tx' | 'contract' | 'token' = 'tx';
      if (type === 'token') dataType = 'token';
      else if (['address', 'contract'].includes(type)) dataType = 'contract';

      return `https://testnet-2.starkscan.co/${dataType}/${id}`;
    }
  };

  return {
    name: 'Starknet (testnet2)',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m',
    baseChainId: l1ChainId,
    baseNetworkId: 'gor',
    hasReceive: true,
    supportsSimulation: true,
    managerConnectors: ['argentx'],
    actions: createActions(provider, helpers, { l1ChainId }),
    api,
    constants,
    helpers
  };
}
