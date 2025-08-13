import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { registerIndexer } from '../register';
import { createWriters as createGovernorBravoWriters } from './protocols/governorBravo/writers';
import { createWriters as createSnapshotXWriters } from './protocols/snapshotX/writers';
import { EVMConfig, Protocols } from './types';

// SnapshotX runs by default unless explicitly disabled
const ENABLE_SNAPSHOT_X = process.env.ENABLE_SNAPSHOT_X !== 'false';
const ENABLE_GOVERNOR_BRAVO = process.env.ENABLE_GOVERNOR_BRAVO === 'true';

const protocols: Protocols = {
  snapshotX: ENABLE_SNAPSHOT_X,
  governorBravo: ENABLE_GOVERNOR_BRAVO
};

const ethConfig = createConfig('eth', protocols);
const sepConfig = createConfig('sep', protocols);
const oethConfig = createConfig('oeth', protocols);
const maticConfig = createConfig('matic', protocols);
const arb1Config = createConfig('arb1', protocols);
const baseConfig = createConfig('base', protocols);
const mntConfig = createConfig('mnt', protocols);
const apeConfig = createConfig('ape', protocols);
const curtisConfig = createConfig('curtis', protocols);

function createWriters(config: EVMConfig) {
  let writers: Record<string, evm.Writer> = {};

  if (config.snapshotXConfig) {
    writers = createSnapshotXWriters(config, config.snapshotXConfig);
  }

  if (config.governorBravoConfig) {
    writers = {
      ...writers,
      ...createGovernorBravoWriters(config, config.governorBravoConfig)
    };
  }

  return writers;
}

const ethIndexer = new evm.EvmIndexer(createWriters(ethConfig));
const sepIndexer = new evm.EvmIndexer(createWriters(sepConfig));
const oethIndexer = new evm.EvmIndexer(createWriters(oethConfig));
const maticIndexer = new evm.EvmIndexer(createWriters(maticConfig));
const arb1Indexer = new evm.EvmIndexer(createWriters(arb1Config));
const baseIndexer = new evm.EvmIndexer(createWriters(baseConfig));
const mntIndexer = new evm.EvmIndexer(createWriters(mntConfig));
const apeIndexer = new evm.EvmIndexer(createWriters(apeConfig));
const curtisIndexer = new evm.EvmIndexer(createWriters(curtisConfig));

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
  registerIndexer(checkpoint, mntConfig.indexerName, mntConfig, mntIndexer);
  registerIndexer(checkpoint, apeConfig.indexerName, apeConfig, apeIndexer);
  registerIndexer(
    checkpoint,
    curtisConfig.indexerName,
    curtisConfig,
    curtisIndexer
  );
}
