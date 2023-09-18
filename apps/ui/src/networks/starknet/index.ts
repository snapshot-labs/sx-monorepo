import { TransactionFinalityStatus } from 'starknet';
import { createApi } from '../common/graphqlApi';
import { STARKNET_CONNECTORS } from '../common/constants';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import { pinPineapple } from '@/helpers/pin';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

export function createStarknetNetwork(networkId: NetworkID): Network {
  const l1ChainId = 5;

  const provider = createProvider(networkId);
  const api = createApi(constants.API_URL, networkId);

  const helpers = {
    pin: pinPineapple,
    waitForTransaction: txId =>
      provider.waitForTransaction(txId, {
        successStates: [
          TransactionFinalityStatus.ACCEPTED_ON_L1,
          TransactionFinalityStatus.ACCEPTED_ON_L2
        ]
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

      const subdomain = networkId === 'sn-tn' ? 'testnet' : 'testnet-2';
      return `https://${subdomain}.starkscan.co/${dataType}/${id}`;
    }
  };

  return {
    name: 'Starknet (testnet)',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m',
    currentUnit: 'second',
    baseChainId: l1ChainId,
    baseNetworkId: 'gor',
    hasReceive: true,
    supportsSimulation: true,
    managerConnectors: STARKNET_CONNECTORS,
    actions: createActions(provider, helpers, { l1ChainId }),
    api,
    constants,
    helpers
  };
}
