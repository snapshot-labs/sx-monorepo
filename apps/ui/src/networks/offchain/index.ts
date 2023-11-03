import { createApi } from './api';
import * as constants from '../starknet/constants';
import { pinPineapple } from '@/helpers/pin';
import { Network } from '@/networks/types';
import { NetworkID } from '@/types';

const HUB_URLS: Partial<Record<NetworkID, string | undefined>> = {
  s: 'https://hub.snapshot.org/graphql',
  's-tn': 'https://testnet.snapshot.org/graphql'
};

export function createOffchainNetwork(networkId: NetworkID): Network {
  const l1ChainId = 1;

  const hubUrl = HUB_URLS[networkId];
  if (!hubUrl) throw new Error(`Unknown network ${networkId}`);

  const api = createApi(hubUrl, networkId);

  const helpers = {
    pin: pinPineapple,
    waitForTransaction: () => {
      throw new Error('Not implemented');
    },
    waitForSpace: () => {
      throw new Error('Not implemented');
    },
    getExplorerUrl: (id: string, type: 'transaction' | 'address' | 'contract' | 'token') => {
      if (type === 'transaction') {
        return `https://signator.io/view?ipfs=${id}`;
      }

      throw new Error('Not implemented');
    }
  };

  return {
    readOnly: true,
    name: 'Starknet (testnet)',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m',
    currentUnit: 'second',
    chainId: l1ChainId,
    baseChainId: l1ChainId,
    hasReceive: false,
    supportsSimulation: false,
    managerConnectors: [],
    api,
    constants,
    helpers,
    actions: {
      getVotingPower: () => Promise.resolve([])
    }
  };
}
