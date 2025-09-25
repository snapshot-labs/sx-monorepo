import { evmNetworks } from '@snapshot-labs/sx';
import { createConfig as createGovernorBravoConfig } from './protocols/governor-bravo/config';
import { createConfig as createOpenZeppelinConfig } from './protocols/open-zeppelin/config';
import { createConfig as createSnapshotXConfig } from './protocols/snapshot-x/config';
import { EVMConfig, NetworkID, PartialConfig, Protocols } from './types';
import { applyConfig } from './utils';

export function createConfig(
  indexerName: NetworkID,
  protocols: Protocols
): EVMConfig {
  const network = evmNetworks[indexerName];

  let snapshotXConfig: ReturnType<typeof createSnapshotXConfig> | null = null;
  let governorBravoConfig: ReturnType<typeof createGovernorBravoConfig> | null =
    null;
  let openZeppelinConfig: ReturnType<typeof createOpenZeppelinConfig> | null =
    null;

  let partialConfig: PartialConfig = {
    sources: [],
    templates: {},
    abis: {}
  };

  if (protocols.snapshotX) {
    snapshotXConfig = createSnapshotXConfig(indexerName);
    partialConfig = applyConfig(partialConfig, 'snapshotX', snapshotXConfig);
  }

  if (protocols.governorBravo) {
    governorBravoConfig = createGovernorBravoConfig(indexerName);

    if (governorBravoConfig) {
      partialConfig = applyConfig(
        partialConfig,
        'governorBravo',
        governorBravoConfig
      );
    }
  }

  if (protocols.openZeppelin) {
    openZeppelinConfig = createOpenZeppelinConfig(indexerName);

    if (openZeppelinConfig) {
      partialConfig = applyConfig(
        partialConfig,
        'openZeppelin',
        openZeppelinConfig
      );
    }
  }

  return {
    indexerName,
    network_node_url: `https://rpc.snapshot.org/${network.Meta.eip712ChainId}`,
    ...partialConfig,
    snapshotXConfig: snapshotXConfig?.protocolConfig,
    governorBravoConfig: governorBravoConfig?.protocolConfig,
    openZeppelinConfig: openZeppelinConfig?.protocolConfig
  };
}
