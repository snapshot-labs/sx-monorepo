import { fetchScoreApi } from './utils';
import { Strategy, SnapshotInfo } from '../../clients/offchain/types';

export default function createRemoteValidateStrategy(type: string): Strategy {
  return {
    type,
    async getVotingPower(
      spaceId: string,
      voterAddress: string,
      params: any,
      snapshotInfo: SnapshotInfo
    ) {
      const isValid = await fetchScoreApi('validate', {
        validation: type,
        author: voterAddress,
        space: spaceId,
        network: snapshotInfo.chainId,
        snapshot: snapshotInfo.at ?? 'latest',
        params: params[0]
      });

      return [isValid ? 1n : 0n];
    }
  };
}
