import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { UNIFIED_API_TESTNET_URL, UNIFIED_API_URL } from '@/helpers/constants';
import { getRelayerInfo } from '@/helpers/mana';
import { pinGraph, pinPineapple } from '@/helpers/pin';
import { getProvider } from '@/helpers/provider';
import { formatAddress } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';
import { createActions } from './actions';
import { createConstants } from './constants';
import { EVM_CONNECTORS } from '../common/constants';
import { createApi } from '../common/graphqlApi';
import { awaitIndexedOnApi } from '../common/helpers';

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
    apiUrl: UNIFIED_API_URL,
    avatar:
      'ipfs://bafkreihcx4zkpfjfcs6fazjp6lcyes4pdhqx3uvnjuo5uj2dlsjopxv5am',
    blockTime: 2.15812
  },
  arb1: {
    name: 'Arbitrum One',
    chainId: 42161,
    currentChainId: 1,
    apiUrl: UNIFIED_API_URL,
    avatar:
      'ipfs://bafkreic2p3zzafvz34y4tnx2kaoj6osqo66fpdo3xnagocil452y766gdq',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  oeth: {
    name: 'OP Mainnet',
    chainId: 10,
    apiUrl: UNIFIED_API_URL,
    avatar:
      'ipfs://bafkreifu2remiqfpsb4hgisbwb3qxedrzpwsea7ik4el45znjcf56xf2ku',
    blockTime: 2
  },
  base: {
    name: 'Base',
    chainId: 8453,
    apiUrl: UNIFIED_API_URL,
    avatar: 'ipfs://QmaxRoHpxZd8PqccAynherrMznMufG6sdmHZLihkECXmZv',
    blockTime: 2
  },
  mnt: {
    name: 'Mantle',
    ticker: 'MNT',
    chainId: 5000,
    apiUrl: UNIFIED_API_URL,
    avatar:
      'ipfs://bafkreidkucwfn4mzo2gtydrt2wogk3je5xpugom67vhi4h4comaxxjzoz4',
    blockTime: 2
  },
  eth: {
    name: 'Ethereum',
    chainId: 1,
    apiUrl: UNIFIED_API_URL,
    avatar:
      'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  ape: {
    name: 'ApeChain',
    ticker: 'APE',
    chainId: 33139,
    currentChainId: 1,
    apiUrl: UNIFIED_API_URL,
    avatar:
      'ipfs://bafkreielbgcox2jsw3g6pqulqb7pyjgx7czjt6ahnibihaij6lozoy53w4',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  curtis: {
    name: 'Curtis',
    ticker: 'APE',
    chainId: 33111,
    currentChainId: 11155111,
    apiUrl: UNIFIED_API_TESTNET_URL,
    avatar:
      'ipfs://bafkreielbgcox2jsw3g6pqulqb7pyjgx7czjt6ahnibihaij6lozoy53w4',
    blockTime: ETH_MAINNET_BLOCK_TIME
  },
  sep: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    apiUrl: UNIFIED_API_TESTNET_URL,
    avatar:
      'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4',
    blockTime: 13.2816
  },
  'base-sep': {
    name: 'Base Sepolia',
    chainId: 84532,
    apiUrl: UNIFIED_API_TESTNET_URL,
    avatar: 'ipfs://QmaxRoHpxZd8PqccAynherrMznMufG6sdmHZLihkECXmZv',
    blockTime: 13.2816
  }
};

export function createEvmNetwork(networkId: NetworkID): Network {
  const { name, chainId, currentChainId, apiUrl, avatar } = METADATA[networkId];

  const pin = networkId === 'mnt' ? pinPineapple : pinGraph;

  const provider = getProvider(chainId);
  const constants = createConstants(networkId, { pin });
  const api = createApi(apiUrl, networkId, constants, {
    // NOTE: Highlight is currently disabled
    // highlightApiUrl: import.meta.env.VITE_HIGHLIGHT_URL
  });

  const helpers = {
    getAuthenticatorSupportInfo: (authenticator: string) =>
      constants.AUTHENTICATORS_SUPPORT_INFO[authenticator] || null,
    isStrategySupported: (strategy: string) =>
      constants.SUPPORTED_STRATEGIES[strategy],
    isExecutorSupported: (executorType: string) =>
      executorType !== 'ReadOnlyExecution',
    isExecutorActionsSupported: (executorType: string) =>
      constants.SUPPORTED_EXECUTORS[executorType],
    pin,
    getSpaceController: async (space: Space) => space.controller,
    getRelayerInfo: (space: string, network: NetworkID) =>
      getRelayerInfo(space, network, provider),
    getTransaction: (txId: string) => provider.getTransaction(txId),
    waitForTransaction: (txId: string) => provider.waitForTransaction(txId),
    waitForIndexing: async (
      txId: string,
      timeout = 10000
    ): Promise<boolean> => {
      return awaitIndexedOnApi({
        txId,
        timeout,
        getLastIndexedBlockNumber: api.loadLastIndexedBlock,
        getTransactionBlockNumber: async (txId: string) => {
          const transaction = await provider.getTransaction(txId);
          return transaction.blockNumber ?? null;
        }
      });
    },
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

      if (dataType === 'address') id = formatAddress(id);

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
      'mnt',
      'arb1',
      'ape',
      'curtis'
    ].includes(networkId),
    managerConnectors: EVM_CONNECTORS,
    actions: createActions(provider, helpers, chainId),
    api,
    constants,
    helpers
  };
}
