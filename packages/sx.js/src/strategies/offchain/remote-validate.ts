import { fetchScoreApi } from './utils';
import { SnapshotInfo, Strategy } from '../../clients/offchain/types';

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
        network: snapshotInfo.chainId?.toString() || '',
        snapshot: snapshotInfo.at ?? 'latest',
        params: params[0],
        delegation: false
      });

      return [isValid ? 1n : 0n];
    }
  };
}
