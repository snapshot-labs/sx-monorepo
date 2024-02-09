import { createApi } from './api';
import * as constants from './constants';
import { pinPineapple } from '@/helpers/pin';
import { Network, VotingPower, SnapshotInfo } from '@/networks/types';
import { NetworkID, StrategyParsedMetadata } from '@/types';

const HUB_URLS: Partial<Record<NetworkID, string | undefined>> = {
  s: 'https://hub.snapshot.org/graphql',
  's-tn': 'https://testnet.hub.snapshot.org/graphql'
};

const SCORE_URL = 'https://score.snapshot.org';

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

      if (type === 'contract') {
        return '';
      }

      throw new Error('Not implemented');
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
    hasReceive: false,
    supportsSimulation: false,
    managerConnectors: [],
    api,
    constants,
    helpers,
    actions: {
      getVotingPower: async (
        strategiesAddresses: string[],
        strategiesParams: any[],
        strategiesMetadata: StrategyParsedMetadata[],
        voterAddress: string,
        snapshotInfo: SnapshotInfo
      ): Promise<VotingPower[]> => {
        const result = await fetch(SCORE_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'get_vp',
            params: {
              address: voterAddress,
              space: '',
              strategies: strategiesParams,
              network: snapshotInfo.chain_id ?? l1ChainId,
              snapshot: snapshotInfo.at ?? 'latest'
            }
          })
        });
        const body = await result.json();

        return body.result.vp_by_strategy.map((vp: number, index: number) => {
          const strategy = strategiesParams[index];

          return {
            address: strategy.name,
            value: BigInt(vp),
            decimals: parseInt(strategy.params.decimals || 0),
            symbol: strategy.params.symbol,
            token: strategy.params.address
          } as VotingPower;
        });
      }
    }
  };
}
