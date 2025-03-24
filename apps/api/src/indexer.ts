import 'dotenv/config';
import Checkpoint from '@snapshot-labs/checkpoint';
import { addEvmIndexers } from './evm';
import { addStarknetIndexers } from './starknet';

const PRODUCTION_INDEXER_DELAY = 60 * 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function startIndexer(checkpoint: Checkpoint) {
  addStarknetIndexers(checkpoint);
  addEvmIndexers(checkpoint);

  if (process.env.NODE_ENV === 'production') {
    console.log(
      'Delaying indexer to prevent multiple processes indexing at the same time.'
    );
    await sleep(PRODUCTION_INDEXER_DELAY);
  }

  await checkpoint.resetMetadata();
  await checkpoint.reset();
  checkpoint.start();
}
