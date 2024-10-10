import networks from '@/helpers/networks.json';
import { pinGraph } from '@/helpers/pin';
import { getProvider } from '@/helpers/provider';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';
import { createActions } from './actions';
import { createConstants } from './constants';
import { EVM_CONNECTORS } from '../common/constants';
import { createApi } from '../common/graphqlApi';

type Metadata = {
  name: string;
  ticker?: string;
  chainId: number;
  currentChainId?: number;
  apiUrl: string;
  avatar: string;
  blockTime: number;
};

// shared for both ETH mainnet and ARB1
const ETH_MAINNET_BLOCK_TIME = 12.09;

export const METADATA: Record<string, Metadata> = {
  matic: {
    name: 'Polygon',
    ticker: 'MATIC',
    chainId: 137,
    apiUrl:
      'https://api.studio.thegraph.com/query/23545/sx-polygon/version/latest',
    avatar:
      'ipfs://bafkreihcx4zkpfjfcs6fazjp6lcyes4pdhqx3uvnjuo5uj2dlsjopxv5am',
    blockTime: 2.15812
  },
  arb1: {
    name: 'Arbitrum One',
    chainId: 42161,
    currentChainId: 1,
    apiUrl:
      'https://api.studio.thegraph.com/query/23545/sx-arbitrum/version/latest',
    avatar:
      'ipfs://bafkreic2p3zzafvz34y4tnx2kaoj6osqo66fpdo3xnagocil452y766gdq',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  oeth: {
    name: 'Optimism',
    chainId: 10,
    apiUrl:
      'https://api.studio.thegraph.com/query/23545/sx-optimism/version/latest',
    avatar: 'ipfs://QmfF4kwhGL8QosUXvgq2KWCmavhKBvwD6kbhs7L4p5ZAWb',
    blockTime: 2
  },
  eth: {
    name: 'Ethereum',
    chainId: 1,
    apiUrl: 'https://api.studio.thegraph.com/query/23545/sx/version/latest',
    avatar:
      'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  sep: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    apiUrl:
      import.meta.env.VITE_EVM_SEPOLIA_API ??
      'https://api.studio.thegraph.com/query/23545/sx-sepolia/version/latest',
    avatar:
      'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4',
    blockTime: 13.2816
  },
  'linea-testnet': {
    name: 'Linea testnet',
    chainId: 59140,
    apiUrl:
      'https://thegraph.goerli.zkevm.consensys.net/subgraphs/name/snapshot-labs/sx-subgraph',
    avatar:
      'ipfs://bafkreibn4mjs54bnmvkrkiaiwp47gvcz6bervg2kr5ubknytfyz6l5wbs4',
    blockTime: 13.52926
  }
};

export function createEvmNetwork(networkId: NetworkID): Network {
  const { name, chainId, currentChainId, apiUrl, avatar } = METADATA[networkId];

  const provider = getProvider(chainId);
  const constants = createConstants(networkId);
  const api = createApi(apiUrl, networkId, constants, {
    highlightApiUrl: import.meta.env.VITE_HIGHLIGHT_URL
  });

  const helpers = {
    isAuthenticatorSupported: (authenticator: string) =>
      constants.SUPPORTED_AUTHENTICATORS[authenticator],
    isAuthenticatorContractSupported: (authenticator: string) =>
      constants.CONTRACT_SUPPORTED_AUTHENTICATORS[authenticator],
    getRelayerAuthenticatorType: (authenticator: string) =>
      constants.RELAYER_AUTHENTICATORS[authenticator],
    isStrategySupported: (strategy: string) =>
      constants.SUPPORTED_STRATEGIES[strategy],
    isExecutorSupported: (executor: string) =>
      constants.SUPPORTED_EXECUTORS[executor],
    pin: pinGraph,
    getSpaceController: async (space: Space) => space.controller,
    getTransaction: (txId: string) => provider.getTransaction(txId),
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
      else if (['address', 'contract', 'strategy'].includes(type))
        dataType = 'address';

      return `${networks[chainId].explorer}/${dataType}/${id}`;
    }
  };

  return {
    name,
    avatar,
    currentUnit: 'block',
    chainId,
    baseChainId: chainId,
    currentChainId: currentChainId ?? chainId,
    supportsSimulation: ['eth', 'sep', 'oeth', 'matic', 'arb1'].includes(
      networkId
    ),
    managerConnectors: EVM_CONNECTORS,
    actions: createActions(provider, helpers, chainId),
    api,
    constants,
    helpers
  };
}
