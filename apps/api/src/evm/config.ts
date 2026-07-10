import { evmNetworks } from '@snapshot-labs/sx';
import { getRpcUrl } from '../config';
import { createConfig as createGovernorBravoConfig } from './protocols/governor-bravo/config';
import { createConfig as createOpenZeppelinConfig } from './protocols/openzeppelin/config';
import { createConfig as createSnapshotXConfig } from './protocols/snapshot-x/config';
import { EVMConfig, NetworkID, PartialConfig } from './types';
import { applyConfig } from './utils';

export function createConfig(indexerName: NetworkID): EVMConfig {
  const network = evmNetworks[indexerName];

  const snapshotXConfig = createSnapshotXConfig(indexerName);
  const governorBravoConfig = createGovernorBravoConfig(indexerName);
  const openZeppelinConfig = createOpenZeppelinConfig(indexerName);

  let partialConfig: PartialConfig = {
    sources: [],
    templates: {},
    abis: {}
  };

  partialConfig = applyConfig(partialConfig, 'snapshotX', snapshotXConfig);

  if (governorBravoConfig) {
    partialConfig = applyConfig(
      partialConfig,
      'governorBravo',
      governorBravoConfig
    );
  }

  if (openZeppelinConfig) {
    partialConfig = applyConfig(
      partialConfig,
      'openZeppelin',
      openZeppelinConfig
    );
  }

  return {
    indexerName,
    network_node_url: getRpcUrl(network.Meta.eip712ChainId),
    ...partialConfig,
    state_retention_blocks: 5000,
    snapshotXConfig: snapshotXConfig.protocolConfig,
    governorBravoConfig: governorBravoConfig?.protocolConfig,
    openZeppelinConfig: openZeppelinConfig?.protocolConfig
  };
}
