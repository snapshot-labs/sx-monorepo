import Checkpoint, { starknet } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { createWriters } from './writers';

const snConfig = createConfig('sn');
const snSepConfig = createConfig('sn-sep');

const snIndexer = new starknet.StarknetIndexer(createWriters(snConfig));
const snSepIndexer = new starknet.StarknetIndexer(createWriters(snSepConfig));

export function addStarknetIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer(snConfig.indexerName, snConfig, snIndexer);
  checkpoint.addIndexer(snSepConfig.indexerName, snSepConfig, snSepIndexer);
}
