import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { pinGraph, pinPineapple } from '@/helpers/pin';
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
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5DzKWssJUVKA1imXGyExrycUjdz7t5t7gzTsE9GQhBUn',
    avatar:
      'ipfs://bafkreihcx4zkpfjfcs6fazjp6lcyes4pdhqx3uvnjuo5uj2dlsjopxv5am',
    blockTime: 2.15812
  },
  arb1: {
    name: 'Arbitrum One',
    chainId: 42161,
    currentChainId: 1,
    apiUrl:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/4QovVxoK3TBLwZKPD1YPHHko5Zz87HvdjpEDBvitCWcH',
    avatar:
      'ipfs://bafkreic2p3zzafvz34y4tnx2kaoj6osqo66fpdo3xnagocil452y766gdq',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  oeth: {
    name: 'OP Mainnet',
    chainId: 10,
    apiUrl:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/4zXNNp5B34DUNACzonVsHivNJRUHnFBqhvBPYJVaNyks',
    avatar:
      'ipfs://bafkreifu2remiqfpsb4hgisbwb3qxedrzpwsea7ik4el45znjcf56xf2ku',
    blockTime: 2
  },
  base: {
    name: 'Base',
    chainId: 8453,
    apiUrl:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/BmcnmDYyCcN7NmQuWXyx3p1xLEiq3sYmvFct8uvBQfum',
    avatar: 'ipfs://QmaxRoHpxZd8PqccAynherrMznMufG6sdmHZLihkECXmZv',
    blockTime: 2
  },
  mantle: {
    name: 'Mantle',
    chainId: 5000,
    apiUrl: 'https://mantle-api.snapshot.box',
    avatar:
      'ipfs://bafkreidkucwfn4mzo2gtydrt2wogk3je5xpugom67vhi4h4comaxxjzoz4',
    blockTime: 2
  },
  eth: {
    name: 'Ethereum',
    chainId: 1,
    apiUrl:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/GerdwbJnTbEz45K7S3D2MLET6VFiY8VqwrqWZg52x2vx',
    avatar:
      'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  sep: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    apiUrl:
      import.meta.env.VITE_EVM_SEPOLIA_API ??
      'https://subgrapher.snapshot.org/subgraph/arbitrum/3682UpSJVQ89v6BMSzxDSiQWZKa3Hbn6RKucpT8jZ5nT',
    avatar:
      'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4',
    blockTime: 13.2816
  }
};

export function createEvmNetwork(networkId: NetworkID): Network {
  const { name, chainId, currentChainId, apiUrl, avatar } = METADATA[networkId];

  const pin = networkId === 'mantle' ? pinPineapple : pinGraph;

  const provider = getProvider(chainId);
  const constants = createConstants(networkId, { pin });
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
    pin,
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

      return `${networks[chainId].explorer.url}/${dataType}/${id}`;
    }
  };

  return {
    name,
    avatar,
    currentUnit: 'block',
    chainId,
    baseChainId: chainId,
    currentChainId: currentChainId ?? chainId,
    supportsSimulation: [
      'eth',
      'sep',
      'oeth',
      'matic',
      'base',
      'arb1'
    ].includes(networkId),
    managerConnectors: EVM_CONNECTORS,
    actions: createActions(provider, helpers, chainId),
    api,
    constants,
    helpers
  };
}
