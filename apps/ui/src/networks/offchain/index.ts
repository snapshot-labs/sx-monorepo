import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { pin } from '@/helpers/pin';
import { getProvider } from '@/helpers/provider';
import { formatAddress, getSpaceController } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { ChainId, NetworkID, Space } from '@/types';
import { createActions } from './actions';
import { createApi } from './api';
import * as constants from './constants';
import { EVM_CONNECTORS, STARKNET_CONNECTORS } from '../common/constants';

const LOCAL_HUB_URL = (import.meta as any).env?.VITE_LOCAL_HUB_URL as
  | string
  | undefined;

const HUB_URLS: Partial<Record<NetworkID, string | undefined>> = {
  s: 'https://hub.snapshot.org/graphql',
  's-tn': LOCAL_HUB_URL || 'https://testnet.hub.snapshot.org/graphql'
};
export function getOffchainHubUrl(networkId: NetworkID): string | undefined {
  return HUB_URLS[networkId];
}
export function getOffchainHubApiBase(networkId: NetworkID): string {
  const hubUrl = HUB_URLS[networkId];
  if (!hubUrl) throw new Error(`Unknown offchain network ${networkId}`);
  return hubUrl.replace(/\/graphql\/?$/, '/api');
}
export const SNAPSHOT_URLS: Partial<Record<NetworkID, string | undefined>> = {
  s: 'https://v1.snapshot.box',
  's-tn': 'https://testnet.v1.snapshot.box'
};
const CHAIN_IDS: Partial<Record<NetworkID, 1 | 11155111>> = {
  s: 1,
  's-tn': 11155111
};

export function createOffchainNetwork(networkId: NetworkID): Network {
  const l1ChainId = CHAIN_IDS[networkId];
  const hubUrl = HUB_URLS[networkId];
  if (!hubUrl || !l1ChainId) throw new Error(`Unknown network ${networkId}`);

  const provider = getProvider(l1ChainId);
  const api = createApi(hubUrl, networkId, constants);

  const isExecutorSupported = (executorType: string) => {
    if (executorType === 'ReadOnlyExecution') return true;
    return false;
  };

  const isExecutorActionsSupported = () => {
    return false;
  };

  const helpers = {
    getAuthenticatorSupportInfo: () => ({
      isSupported: true,
      isContractSupported: false,
      isReasonSupported: true,
      connectors: Array.from(
        new Set([...EVM_CONNECTORS, ...STARKNET_CONNECTORS])
      )
    }),
    isStrategySupported: () => true,
    isExecutorSupported: isExecutorSupported,
    isExecutorActionsSupported: isExecutorActionsSupported,
    pin,
    getSpaceController: async (space: Space) =>
      getSpaceController(space.id, networkId),
    getRelayerInfo: () => Promise.resolve(null),
    getTransaction: () => {
      throw new Error('Not implemented');
    },
    waitForTransaction: (txId: string) => provider.waitForTransaction(txId),
    waitForIndexing: async () => true,
    waitForSpace: () => {
      throw new Error('Not implemented');
    },
    getExplorerUrl: (
      id: string,
      type:
        | 'transaction'
        | 'address'
        | 'contract'
        | 'strategy'
        | 'token'
        | 'block',
      chainId?: ChainId
    ) => {
      chainId = chainId || l1ChainId;
      const network = networks[chainId.toString()];

      switch (type) {
        case 'transaction':
          if (id.startsWith('0x')) {
            return network ? `${network.explorer.url}/tx/${id}` : '';
          }

          if (network.starknet) return '';

          return `https://signator.io/ipfs/${id}`;
        case 'strategy':
          return `${SNAPSHOT_URLS[networkId]}/#/strategy/${id}`;
        case 'contract':
        case 'address':
          return network
            ? `${network.explorer.url}/${network.starknet ? 'contract' : 'address'}/${formatAddress(id)}`
            : '';
        case 'block':
          return network ? `${network.explorer.url}/block/${id}` : '';
        default:
          throw new Error('Not implemented');
      }
    }
  };

  return {
    readOnly: true,
    name: networkId === 's-tn' ? 'Snapshot (testnet)' : 'Snapshot',
    avatar: '',
    currentUnit: 'second',
    chainId: l1ChainId,
    baseChainId: l1ChainId,
    currentChainId: l1ChainId,
    supportsSimulation: true,
    managerConnectors: constants.CONNECTORS,
    api,
    constants,
    helpers,
    actions: createActions(constants, helpers, l1ChainId)
  };
}
