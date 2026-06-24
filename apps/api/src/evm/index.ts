import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { registerIndexer } from '../register';
import { createWriters as createGovernorBravoWriters } from './protocols/governor-bravo/writers';
import { createWriters as createOpenZeppelinWriters } from './protocols/openzeppelin/writers';
import { createWriters as createSnapshotXWriters } from './protocols/snapshot-x/writers';
import { EVMConfig, NetworkID, Protocols } from './types';
import { applyProtocolPrefixToWriters } from './utils';

const HYPERSYNC_SUPPORTED_NETWORKS = new Set<NetworkID>([
  'eth',
  'sep',
  'oeth',
  'matic',
  'arb1',
  'base',
  'mnt',
  'bnb',
  'bnbt',
  // Not supported yet
  // 'ape',
  'curtis'
]);

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
const bnbConfig = createConfig('bnb', protocols);
const bnbtConfig = createConfig('bnbt', protocols);
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

function createIndexer(config: EVMConfig) {
  const writers = createWriters(config);

  if (
    process.env.HYPERSYNC_API_TOKEN &&
    HYPERSYNC_SUPPORTED_NETWORKS.has(config.indexerName)
  ) {
    return new evm.HyperSyncEvmIndexer(writers, {
      apiToken: process.env.HYPERSYNC_API_TOKEN
    });
  }

  return new evm.EvmIndexer(writers);
}

const ethIndexer = createIndexer(ethConfig);
const sepIndexer = createIndexer(sepConfig);
const oethIndexer = createIndexer(oethConfig);
const maticIndexer = createIndexer(maticConfig);
const arb1Indexer = createIndexer(arb1Config);
const baseIndexer = createIndexer(baseConfig);
const mntIndexer = createIndexer(mntConfig);
const bnbIndexer = createIndexer(bnbConfig);
const bnbtIndexer = createIndexer(bnbtConfig);
const apeIndexer = createIndexer(apeConfig);
const curtisIndexer = createIndexer(curtisConfig);

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
  registerIndexer(checkpoint, bnbConfig.indexerName, bnbConfig, bnbIndexer);
  registerIndexer(checkpoint, bnbtConfig.indexerName, bnbtConfig, bnbtIndexer);
  registerIndexer(checkpoint, apeConfig.indexerName, apeConfig, apeIndexer);
  registerIndexer(
    checkpoint,
    curtisConfig.indexerName,
    curtisConfig,
    curtisIndexer
  );
}
