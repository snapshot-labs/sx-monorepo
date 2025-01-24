import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { createWriters } from './writers';

const sepConfig = createConfig('sep');

const sepIndexer = new evm.EvmIndexer(createWriters(sepConfig));

export function addEvmIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer(sepConfig.indexerName, sepConfig, sepIndexer);
}
