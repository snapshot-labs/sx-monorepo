import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getRelayerInfo } from '@/helpers/mana';
import { pin } from '@/helpers/pin';
import { getProvider } from '@/helpers/provider';
import { formatAddress } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';
import { createActions } from './actions';
import { createConstants } from './constants';
import { METADATA } from './metadata';
import { EVM_CONNECTORS } from '../common/constants';
import { createApi } from '../common/graphqlApi';
import { awaitIndexedOnApi } from '../common/helpers';

export function createEvmNetwork(networkId: NetworkID): Network {
  const { name, chainId, currentChainId, apiUrl, avatar } = METADATA[networkId];

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
    waitForTransaction: (txId: string) =>
      new Promise((resolve, reject) => {
        let retries = 0;

        const timer = setInterval(async () => {
          let receipt;
          try {
            receipt = await provider.getTransactionReceipt(txId);
          } catch {
            if (retries++ > 60) {
              clearInterval(timer);
              reject(new Error('Transaction not found'));
            }
            return;
          }

          if (!receipt) return;

          clearInterval(timer);
          if (receipt.status === 0) reject(receipt);
          else resolve(receipt);
        }, 2000);
      }),
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
      'bnb',
      'bnbt',
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
