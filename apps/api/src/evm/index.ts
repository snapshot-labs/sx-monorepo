import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { registerIndexer } from '../register';
import { createWriters as createGovernorBravoWriters } from './protocols/governor-bravo/writers';
import { createWriters as createOpenZeppelinWriters } from './protocols/openzeppelin/writers';
import { createWriters as createSnapshotXWriters } from './protocols/snapshot-x/writers';
import { EVMConfig, Protocols } from './types';
import { applyProtocolPrefixToWriters } from './utils';

// SnapshotX runs by default unless explicitly disabled
export const ENABLE_SNAPSHOT_X = process.env.ENABLE_SNAPSHOT_X !== 'false';
export const ENABLE_GOVERNOR_BRAVO =
  process.env.ENABLE_GOVERNOR_BRAVO === 'true';
export const ENABLE_OPENZEPPELIN = process.env.ENABLE_OPENZEPPELIN === 'true';

const protocols: Protocols = {
  snapshotX: ENABLE_SNAPSHOT_X,
  governorBravo: ENABLE_GOVERNOR_BRAVO,
  openZeppelin: ENABLE_OPENZEPPELIN
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
    writers = applyProtocolPrefixToWriters(
      'snapshotX',
      createSnapshotXWriters(config, config.snapshotXConfig)
    );
  }

  if (config.governorBravoConfig) {
    writers = {
      ...writers,
      ...applyProtocolPrefixToWriters(
        'governorBravo',
        createGovernorBravoWriters(config, config.governorBravoConfig)
      )
    };
  }

  if (config.openZeppelinConfig) {
    writers = {
      ...writers,
      ...applyProtocolPrefixToWriters(
        'openZeppelin',
        createOpenZeppelinWriters(config, config.openZeppelinConfig)
      )
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
