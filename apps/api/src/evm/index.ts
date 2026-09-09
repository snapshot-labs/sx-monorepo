import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { registerIndexer } from '../register';
import { createWriters as createGovernorBravoWriters } from './protocols/governor-bravo/writers';
import { createWriters as createOpenZeppelinWriters } from './protocols/openzeppelin/writers';
import { createWriters as createSnapshotXWriters } from './protocols/snapshot-x/writers';
import { createRpcSelector } from './rpc';
import { EVMConfig } from './types';
import { applyProtocolPrefixToWriters } from './utils';

const ethConfig = createConfig('eth');
const sepConfig = createConfig('sep');
const oethConfig = createConfig('oeth');
const maticConfig = createConfig('matic');
const arb1Config = createConfig('arb1');
const baseConfig = createConfig('base');
const mntConfig = createConfig('mnt');
const bnbConfig = createConfig('bnb');
const bnbtConfig = createConfig('bnbt');
const apeConfig = createConfig('ape');
const curtisConfig = createConfig('curtis');
const basesepConfig = createConfig('basesep');

function createWriters(config: EVMConfig) {
  let writers = applyProtocolPrefixToWriters(
    'snapshotX',
    createSnapshotXWriters(config, config.snapshotXConfig)
  );

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
  return new evm.EvmIndexer(createWriters(config), {
    rpcSelector: createRpcSelector(config)
  });
}

const ethIndexer = createIndexer(ethConfig);
const sepIndexer = createIndexer(sepConfig);
const oethIndexer = createIndexer(oethConfig);
const maticIndexer = createIndexer(maticConfig);
const arb1Indexer = process.env.HYPERSYNC_API_TOKEN
  ? new evm.HyperSyncEvmIndexer(createWriters(arb1Config), {
      apiToken: process.env.HYPERSYNC_API_TOKEN,
      rpcSelector: createRpcSelector(arb1Config)
    })
  : createIndexer(arb1Config);
const baseIndexer = createIndexer(baseConfig);
const mntIndexer = createIndexer(mntConfig);
const bnbIndexer = createIndexer(bnbConfig);
const bnbtIndexer = createIndexer(bnbtConfig);
const apeIndexer = createIndexer(apeConfig);
const curtisIndexer = createIndexer(curtisConfig);
const basesepIndexer = createIndexer(basesepConfig);

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
  registerIndexer(
    checkpoint,
    basesepConfig.indexerName,
    basesepConfig,
    basesepIndexer
  );
}
