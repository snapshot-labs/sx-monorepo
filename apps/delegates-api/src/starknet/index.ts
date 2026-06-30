import Checkpoint, { starknet } from '@snapshot-labs/checkpoint';
import createConfig from './config';
import createWriters from './writers';

const snIndexer = new starknet.StarknetIndexer(createWriters('sn'));

export function addStarknetIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer('sn', createConfig('sn'), snIndexer);
}
