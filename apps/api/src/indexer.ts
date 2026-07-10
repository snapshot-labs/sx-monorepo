import 'dotenv/config';
import Checkpoint from '@snapshot-labs/checkpoint';
import { addEvmIndexers } from './evm';
import { addStarknetIndexers } from './starknet';

const GIT_COMMIT = process.env.GIT_COMMIT;

export async function startIndexer(checkpoint: Checkpoint) {
  addStarknetIndexers(checkpoint);
  addEvmIndexers(checkpoint);

  const versionTag = GIT_COMMIT ? `commit:${GIT_COMMIT}` : undefined;

  await checkpoint.syncVersion(versionTag);

  checkpoint.start();
}
