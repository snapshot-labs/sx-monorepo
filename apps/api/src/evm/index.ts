import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import { createConfig } from './config';
import { registerIndexer } from '../register';
import { createWriters as createGovernorBravoWriters } from './protocols/governor-bravo/writers';
import { createWriters as createOpenZeppelinWriters } from './protocols/openzeppelin/writers';
import { createWriters as createSnapshotXWriters } from './protocols/snapshot-x/writers';
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

const ethIndexer = new evm.EvmIndexer(createWriters(ethConfig));
const sepIndexer = new evm.EvmIndexer(createWriters(sepConfig));
const oethIndexer = new evm.EvmIndexer(createWriters(oethConfig));
const maticIndexer = new evm.EvmIndexer(createWriters(maticConfig));
const arb1Indexer = process.env.HYPERSYNC_API_TOKEN
  ? new evm.HyperSyncEvmIndexer(createWriters(arb1Config), {
      apiToken: process.env.HYPERSYNC_API_TOKEN
    })
  : new evm.EvmIndexer(createWriters(arb1Config));
const baseIndexer = new evm.EvmIndexer(createWriters(baseConfig));
const mntIndexer = new evm.EvmIndexer(createWriters(mntConfig));
const bnbIndexer = new evm.EvmIndexer(createWriters(bnbConfig));
const bnbtIndexer = new evm.EvmIndexer(createWriters(bnbtConfig));
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
