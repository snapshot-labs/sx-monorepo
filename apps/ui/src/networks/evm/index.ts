import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import * as constants from './constants';
import { pinGraph } from '@/helpers/pin';
import { getProvider } from '@/helpers/provider';
import networks from '@/helpers/networks.json';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

const METADATA = {
  gor: {
    name: 'Ethereum Goerli',
    chainId: 5,
    apiUrl: 'https://api.studio.thegraph.com/query/23545/sx-goerli/version/latest',
    avatar: 'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4'
  },
  sep: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    apiUrl: 'https://api.studio.thegraph.com/query/23545/sx-sepolia/version/latest',
    avatar: 'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4'
  },
  'linea-testnet': {
    name: 'Linea testnet',
    chainId: 59140,
    apiUrl: 'https://thegraph.goerli.zkevm.consensys.net/subgraphs/name/snapshot-labs/sx-subgraph',
    avatar: 'ipfs://bafkreibn4mjs54bnmvkrkiaiwp47gvcz6bervg2kr5ubknytfyz6l5wbs4'
  }
};

export function createEvmNetwork(networkId: NetworkID): Network {
  const { name, chainId, apiUrl, avatar } = METADATA[networkId];

  const provider = getProvider(chainId);
  const api = createApi(apiUrl, networkId);

  const helpers = {
    pin: pinGraph,
    waitForTransaction: (txId: string) => provider.waitForTransaction(txId),
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
      let dataType: 'tx' | 'address' | 'token' = 'tx';
      if (type === 'token') dataType = 'token';
      else if (['address', 'contract'].includes(type)) dataType = 'address';

      return `${networks[chainId].explorer}/${dataType}/${id}`;
    }
  };

  return {
    name,
    avatar,
    baseChainId: chainId,
    hasReceive: false,
    supportsSimulation: networkId === 'gor' || networkId === 'sep',
    managerConnectors: ['injected', 'walletconnect', 'walletlink', 'portis', 'gnosis'],
    actions: createActions(provider, helpers, chainId),
    api,
    constants,
    helpers
  };
}
