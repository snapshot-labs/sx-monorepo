import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import * as constants from './constants';
import { pinGraph } from '@/helpers/graph';
import { getProvider } from '@/helpers/provider';
import networks from '@/helpers/networks.json';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

const METADATA = {
  gor: {
    name: 'Ethereum Goerli',
    chainId: 5,
    apiUrl: 'https://api.studio.thegraph.com/query/23545/sx-goerli/version/latest'
  },
  sep: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    apiUrl: 'https://api.studio.thegraph.com/query/23545/sx-sepolia/version/latest'
  }
};

export function createEvmNetwork(networkId: NetworkID): Network {
  const { name, chainId, apiUrl } = METADATA[networkId];

  const provider = getProvider(chainId);
  const api = createApi(apiUrl, networkId);

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
    name,
    baseChainId: chainId,
    hasReceive: false,
    managerConnectors: ['injected', 'walletconnect', 'walletlink', 'portis', 'gnosis'],
    actions: createActions(provider, helpers, chainId),
    api,
    constants,
    helpers
  };
}
