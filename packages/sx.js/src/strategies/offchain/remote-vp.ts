import { fetchScoreApi } from './utils';
import { Strategy, SnapshotInfo } from '../../clients/offchain/types';

export default function createRemoteVpStrategy(): Strategy {
  return {
    type: 'remote-vp',
    async getVotingPower(
      spaceId: string,
      voterAddress: string,
      params: any,
      snapshotInfo: SnapshotInfo
    ) {
      const result = await fetchScoreApi('get_vp', {
        address: voterAddress,
        space: spaceId,
        strategies: params,
        network: snapshotInfo.chainId,
        snapshot: snapshotInfo.at ?? 'latest'
      });

      return result.vp_by_strategy.map((vp: number, i: number) => {
        const strategy = params[i];
        const decimals = parseInt(strategy.params.decimals || 18);

        return BigInt(Math.floor(vp * 10 ** decimals));
      });
    }
  };
}
