import 'dotenv/config';
import Checkpoint from '@snapshot-labs/checkpoint';
import {
  addEvmIndexers,
  ENABLE_GOVERNOR_BRAVO,
  ENABLE_OPENZEPPELIN,
  ENABLE_SNAPSHOT_X
} from './evm';
import logger from './logger';
import { addStarknetIndexers } from './starknet';

const PRODUCTION_INDEXER_DELAY = 60 * 1000;

const GIT_COMMIT = process.env.GIT_COMMIT;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function initializeCheckpoint(checkpoint: Checkpoint) {
  if (!GIT_COMMIT) {
    logger.info('No git commit found, resetting database.');

    await checkpoint.resetMetadata();
    await checkpoint.reset();

    return;
  }

  const currentVersionTag = `commit:${GIT_COMMIT}|snapshotX:${ENABLE_SNAPSHOT_X}|governorBravo:${ENABLE_GOVERNOR_BRAVO}|openZeppelin:${ENABLE_OPENZEPPELIN}`;
  const { knex } = checkpoint.getBaseContext();

  const isInitialized = await knex.schema.hasTable('_metadatas');

  if (isInitialized) {
    const versionTagRow = await knex
      .select('*')
      .from('_metadatas')
      .where({ id: 'version_tag', indexer: '_global' })
      .first();

    const storedVersionTag = versionTagRow?.value ?? null;

    if (storedVersionTag === currentVersionTag) {
      return logger.info(
        { currentVersionTag, storedVersionTag },
        'No change detected. Continuing.'
      );
    }

    logger.info(
      { currentVersionTag, storedVersionTag },
      'Stored version tag differs from current. Resetting database.'
    );
  }

  await checkpoint.resetMetadata();
  await checkpoint.reset();

  await knex('_metadatas').insert({
    id: 'version_tag',
    indexer: '_global',
    value: currentVersionTag
  });
}

export async function startIndexer(checkpoint: Checkpoint) {
  addStarknetIndexers(checkpoint);
  addEvmIndexers(checkpoint);

  if (IS_PRODUCTION) {
    logger.info(
      'Delaying indexer to prevent multiple processes indexing at the same time.'
    );
    await sleep(PRODUCTION_INDEXER_DELAY);
  }

  await initializeCheckpoint(checkpoint);

  checkpoint.start();
}
