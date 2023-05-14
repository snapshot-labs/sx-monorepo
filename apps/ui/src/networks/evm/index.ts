import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import * as constants from './constants';
import { pinGraph } from '@/helpers/graph';
import { getProvider } from '@/helpers/provider';
import networks from '@/helpers/networks.json';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

export function createEvmNetwork(networkId: NetworkID): Network {
  const chainId = 5;

  const provider = getProvider(chainId);
  const api = createApi(constants.API_URL, networkId);

  const helpers = {
    pin: pinGraph,
    waitForTransaction: (txId: string) => provider.waitForTransaction(txId),
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
      let dataType: 'tx' | 'address' = 'tx';
      if (['address', 'contract'].includes(type)) dataType = 'address';

      return `${networks[chainId].explorer}/${dataType}/${id}`;
    }
  };

  return {
    name: 'Ethereum Goerli',
    baseChainId: chainId,
    hasReceive: false,
    managerConnectors: ['injected', 'walletconnect', 'walletlink', 'portis', 'gnosis'],
    actions: createActions(provider, helpers, chainId),
    api,
    constants,
    helpers
  };
}
