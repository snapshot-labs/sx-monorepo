import { StrategyParsedMetadata } from '@/types';
import {
  ReadOnlyNetworkActions,
  NetworkConstants,
  NetworkHelpers,
  SnapshotInfo,
  VotingPower
} from '../types';

const SCORE_URL = 'https://score.snapshot.org';

export function createActions(
  constants: NetworkConstants,
  helpers: NetworkHelpers,
  chainId: number
): ReadOnlyNetworkActions {
  return {
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
            network: snapshotInfo.chainId ?? chainId,
            snapshot: snapshotInfo.at ?? 'latest'
          }
        })
      });
      const body = await result.json();

      return body.result.vp_by_strategy.map((vp: number, index: number) => {
        const strategy = strategiesParams[index];
        const decimals = parseInt(strategy.params.decimals || 0);

        return {
          address: strategy.name,
          value: BigInt(vp * 10 ** decimals),
          decimals,
          symbol: strategy.params.symbol,
          token: strategy.params.address,
          chainId: strategy.network ? parseInt(strategy.network) : undefined
        } as VotingPower;
      });
    }
  };
}
