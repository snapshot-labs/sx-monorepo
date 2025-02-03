import Checkpoint, { starknet } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { createWriters } from './writers';
import { registerIndexer } from '../register';

const snConfig = createConfig('sn');
const snSepConfig = createConfig('sn-sep');

const snIndexer = new starknet.StarknetIndexer(createWriters(snConfig));
const snSepIndexer = new starknet.StarknetIndexer(createWriters(snSepConfig));

export function addStarknetIndexers(checkpoint: Checkpoint) {
  registerIndexer(checkpoint, snConfig.indexerName, snConfig, snIndexer);
  registerIndexer(
    checkpoint,
    snSepConfig.indexerName,
    snSepConfig,
    snSepIndexer
  );
}
