import 'dotenv/config';
import Checkpoint from '@snapshot-labs/checkpoint';
import {
  addEvmIndexers,
  ENABLE_GOVERNOR_BRAVO,
  ENABLE_OPENZEPPELIN,
  ENABLE_SNAPSHOT_X
} from './evm';
import { addStarknetIndexers } from './starknet';

const GIT_COMMIT = process.env.GIT_COMMIT;

export async function startIndexer(checkpoint: Checkpoint) {
  addStarknetIndexers(checkpoint);
  addEvmIndexers(checkpoint);

  const versionTag = GIT_COMMIT
    ? `commit:${GIT_COMMIT}|snapshotX:${ENABLE_SNAPSHOT_X}|governorBravo:${ENABLE_GOVERNOR_BRAVO}|openZeppelin:${ENABLE_OPENZEPPELIN}`
    : undefined;

  await checkpoint.syncVersion(versionTag);

  checkpoint.start();
}
