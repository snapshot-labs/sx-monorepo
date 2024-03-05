import { fetchScoreApi } from './utils';
import { Strategy, SnapshotInfo } from '../../clients/offchain/types';

export default function createRemoteVpStrategy(): Strategy {
  return {
    type: 'remote-vp',
    async getVotingPower(voterAddress: string, params: any, snapshotInfo: SnapshotInfo) {
      const result = await fetchScoreApi('get_vp', {
        address: voterAddress,
        space: '',
        strategies: params,
        network: snapshotInfo.chainId,
        snapshot: snapshotInfo.at ?? 'latest'
      });

      return result.vp_by_strategy.map((vp: number, i: number) => {
        const strategy = params[i];
        const decimals = parseInt(strategy.params.decimals || 0);

        return BigInt(vp * 10 ** decimals);
      });
    }
  };
}
