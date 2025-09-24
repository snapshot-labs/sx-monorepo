import { LibraryError, constants as starknetConstants } from 'starknet';
import { API_TESTNET_URL, API_URL } from '@/helpers/constants';
import { getRelayerInfo } from '@/helpers/mana';
import { pinPineapple } from '@/helpers/pin';
import { formatAddress } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';
import { createActions } from './actions';
import { createConstants } from './constants';
import { createProvider } from './provider';
import { STARKNET_CONNECTORS } from '../common/constants';
import { createApi } from '../common/graphqlApi';
import { awaitIndexedOnApi } from '../common/helpers';

type Metadata = {
  name: string;
  chainId: starknetConstants.StarknetChainId;
  baseChainId: number;
  baseNetworkId: NetworkID;
  rpcUrl: string;
  ethRpcUrl: string;
  explorerUrl: string;
  apiUrl: string;
  avatar: string;
};

export const METADATA: Partial<Record<NetworkID, Metadata>> = {
  sn: {
    name: 'Starknet',
    chainId: starknetConstants.StarknetChainId.SN_MAIN,
    baseChainId: 1,
    baseNetworkId: 'eth',
    rpcUrl: 'https://rpc.snapshot.org/sn',
    ethRpcUrl: 'https://rpc.snapshot.org/1',
    apiUrl: API_URL,
    explorerUrl: 'https://starkscan.co',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m'
  },
  'sn-sep': {
    name: 'Starknet Sepolia',
    chainId: starknetConstants.StarknetChainId.SN_SEPOLIA,
    baseChainId: 11155111,
    baseNetworkId: 'sep',
    rpcUrl: 'https://rpc.snapshot.org/sn-sep',
    ethRpcUrl: 'https://rpc.snapshot.org/11155111',
    apiUrl: API_TESTNET_URL,
    explorerUrl: 'https://sepolia.starkscan.co',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m'
  }
};

export function createStarknetNetwork(networkId: NetworkID): Network {
  const metadata = METADATA[networkId];
  if (!metadata) throw new Error(`Unsupported network ${networkId}`);

  const {
    name,
    chainId,
    baseChainId,
    baseNetworkId,
    rpcUrl,
    ethRpcUrl,
    apiUrl,
    explorerUrl,
    avatar
  } = metadata;

  const provider = createProvider(rpcUrl);
  const constants = createConstants(networkId, baseNetworkId, baseChainId);
  const api = createApi(apiUrl, networkId, constants, {
    baseNetworkId
  });

  const helpers = {
    getAuthenticatorSupportInfo: (authenticator: string) =>
      constants.AUTHENTICATORS_SUPPORT_INFO[authenticator] || null,
    isStrategySupported: (strategy: string) =>
      constants.SUPPORTED_STRATEGIES[strategy],
    isExecutorSupported: (executor: string) =>
      constants.SUPPORTED_EXECUTORS[executor],
    isExecutorActionsSupported: (executor: string) =>
      constants.SUPPORTED_EXECUTORS[executor],
    pin: pinPineapple,
    getSpaceController: async (space: Space) => space.controller,
    getTransaction: txId => provider.getTransactionReceipt(txId),
    getRelayerInfo: (space: string, network: NetworkID) =>
      getRelayerInfo(space, network, provider),
    waitForTransaction: txId => {
      let retries = 0;

      return new Promise((resolve, reject) => {
        const timer = setInterval(async () => {
          let tx: Awaited<ReturnType<typeof provider.getTransactionReceipt>>;
          try {
            tx = await provider.getTransactionReceipt(txId);
          } catch (e) {
            if (
              e instanceof LibraryError &&
              e.message.includes('Transaction hash not found')
            ) {
              if (retries > 60) {
                clearInterval(timer);
                reject();
              }

              retries++;
            }

            return;
          }

          if (tx.isSuccess()) {
            resolve(tx);
          } else {
            reject(tx);
          }

          clearInterval(timer);
        }, 2000);
      });
    },
    waitForIndexing: async (
      txId: string,
      timeout = 10000
    ): Promise<boolean> => {
      return awaitIndexedOnApi({
        txId,
        timeout,
        getLastIndexedBlockNumber: api.loadLastIndexedBlock,
        getTransactionBlockNumber: async (txId: string) => {
          const transaction = await provider.getTransactionReceipt(txId);
          if (
            'block_number' in transaction &&
            typeof transaction.block_number === 'number'
          ) {
            return transaction.block_number;
          }

          return null;
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
      let dataType: 'tx' | 'contract' | 'token' = 'tx';
      if (type === 'token') dataType = 'token';
      else if (['address', 'contract', 'strategy'].includes(type))
        dataType = 'contract';

      if (dataType === 'contract') id = formatAddress(id);

      return `${explorerUrl}/${dataType}/${id}`;
    }
  };

  return {
    name,
    avatar,
    currentUnit: 'second',
    chainId,
    baseChainId,
    currentChainId: baseChainId,
    baseNetworkId,
    supportsSimulation: true,
    managerConnectors: STARKNET_CONNECTORS,
    actions: createActions(networkId, provider, helpers, {
      chainId,
      l1ChainId: baseChainId,
      ethUrl: ethRpcUrl
    }),
    api,
    constants,
    helpers
  };
}
