import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getSpaceController } from '@/helpers/ens';
import { pinPineapple } from '@/helpers/pin';
import { getProvider } from '@/helpers/provider';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';
import { createActions } from './actions';
import { createApi } from './api';
import * as constants from './constants';

const HUB_URLS: Partial<Record<NetworkID, string | undefined>> = {
  s: 'https://hub.snapshot.org/graphql',
  's-tn': 'https://testnet.hub.snapshot.org/graphql'
};
const SNAPSHOT_URLS: Partial<Record<NetworkID, string | undefined>> = {
  s: 'https://snapshot.org',
  's-tn': 'https://testnet.snapshot.org'
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

  const helpers = {
    isAuthenticatorSupported: () => true,
    isAuthenticatorContractSupported: () => false,
    getRelayerAuthenticatorType: () => null,
    isStrategySupported: () => true,
    isExecutorSupported: (executorType: string) => {
      if (executorType === 'oSnap') return true;
      if (executorType === 'ReadOnlyExecution') return true;
      return false;
    },
    pin: pinPineapple,
    getSpaceController: async (space: Space) =>
      getSpaceController(space.id, l1ChainId),
    getTransaction: () => {
      throw new Error('Not implemented');
    },
    waitForTransaction: (txId: string) => provider.waitForTransaction(txId),
    waitForSpace: () => {
      throw new Error('Not implemented');
    },
    getExplorerUrl: (
      id: string,
      type: 'transaction' | 'address' | 'contract' | 'strategy' | 'token',
      chainId?: number
    ) => {
      chainId = chainId || l1ChainId;
      const network = networks[chainId.toString()];

      switch (type) {
        case 'transaction':
          if (id.startsWith('0x')) {
            return network ? `${network.explorer.url}/tx/${id}` : '';
          }

          return `https://signator.io/view?ipfs=${id}`;
        case 'strategy':
          return `${SNAPSHOT_URLS[networkId]}/#/strategy/${id}`;
        case 'contract':
        case 'address':
          return network ? `${network.explorer.url}/address/${id}` : '';
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
