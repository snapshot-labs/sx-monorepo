import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { createWriters } from './writers';

const ethConfig = createConfig('eth');
const sepConfig = createConfig('sep');
const oethConfig = createConfig('oeth');
const maticConfig = createConfig('matic');
const arb1Config = createConfig('arb1');
const baseConfig = createConfig('base');

const ethIndexer = new evm.EvmIndexer(createWriters(ethConfig));
const sepIndexer = new evm.EvmIndexer(createWriters(sepConfig));
const oethIndexer = new evm.EvmIndexer(createWriters(oethConfig));
const maticIndexer = new evm.EvmIndexer(createWriters(maticConfig));
const arb1Indexer = new evm.EvmIndexer(createWriters(arb1Config));
const baseIndexer = new evm.EvmIndexer(createWriters(baseConfig));

export function addEvmIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer(ethConfig.indexerName, ethConfig, ethIndexer);
  checkpoint.addIndexer(sepConfig.indexerName, sepConfig, sepIndexer);
  checkpoint.addIndexer(oethConfig.indexerName, oethConfig, oethIndexer);
  checkpoint.addIndexer(maticConfig.indexerName, maticConfig, maticIndexer);
  checkpoint.addIndexer(arb1Config.indexerName, arb1Config, arb1Indexer);
  checkpoint.addIndexer(baseConfig.indexerName, baseConfig, baseIndexer);
}
