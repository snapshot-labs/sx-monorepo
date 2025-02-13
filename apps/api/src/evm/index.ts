import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { createWriters } from './writers';
import { registerIndexer } from '../register';

const ethConfig = createConfig('eth');
const sepConfig = createConfig('sep');
const oethConfig = createConfig('oeth');
const maticConfig = createConfig('matic');
const arb1Config = createConfig('arb1');
const baseConfig = createConfig('base');
const mantleConfig = createConfig('mantle');

const ethIndexer = new evm.EvmIndexer(createWriters(ethConfig));
const sepIndexer = new evm.EvmIndexer(createWriters(sepConfig));
const oethIndexer = new evm.EvmIndexer(createWriters(oethConfig));
const maticIndexer = new evm.EvmIndexer(createWriters(maticConfig));
const arb1Indexer = new evm.EvmIndexer(createWriters(arb1Config));
const baseIndexer = new evm.EvmIndexer(createWriters(baseConfig));
const mantleIndexer = new evm.EvmIndexer(createWriters(mantleConfig));

export function addEvmIndexers(checkpoint: Checkpoint) {
  registerIndexer(checkpoint, ethConfig.indexerName, ethConfig, ethIndexer);
  registerIndexer(checkpoint, sepConfig.indexerName, sepConfig, sepIndexer);
  registerIndexer(checkpoint, oethConfig.indexerName, oethConfig, oethIndexer);
  registerIndexer(
    checkpoint,
    maticConfig.indexerName,
    maticConfig,
    maticIndexer
  );
  registerIndexer(checkpoint, arb1Config.indexerName, arb1Config, arb1Indexer);
  registerIndexer(checkpoint, baseConfig.indexerName, baseConfig, baseIndexer);
  registerIndexer(
    checkpoint,
    mantleConfig.indexerName,
    mantleConfig,
    mantleIndexer
  );
}
