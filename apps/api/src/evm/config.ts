import { evmNetworks } from '@snapshot-labs/sx';
import { createConfig as createGovernorBravoConfig } from './protocols/governorBravo/config';
import { createConfig as createSnapshotXConfig } from './protocols/snapshotX/config';
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

  return {
    indexerName,
    network_node_url: `https://rpc.snapshot.org/${network.Meta.eip712ChainId}`,
    ...partialConfig,
    snapshotXConfig: snapshotXConfig?.protocolConfig,
    governorBravoConfig: governorBravoConfig?.protocolConfig
  };
}
