import { evmNetworks } from '@snapshot-labs/sx';
import { createConfig as createGovernorBravoConfig } from './protocols/governor-bravo/config';
import { createConfig as createOpenZeppelinConfig } from './protocols/openzeppelin/config';
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

  // Snapshot's RPC proxy doesn't cover Base Sepolia (Inco demo chain). Fall back
  // to env override or the public endpoint. Other chains keep the proxy URL.
  const networkNodeUrl =
    indexerName === 'basesep'
      ? process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
      : `https://rpc.snapshot.org/${network.Meta.eip712ChainId}`;

  return {
    indexerName,
    network_node_url: networkNodeUrl,
    ...partialConfig,
    state_retention_blocks: 5000,
    snapshotXConfig: snapshotXConfig?.protocolConfig,
    governorBravoConfig: governorBravoConfig?.protocolConfig,
    openZeppelinConfig: openZeppelinConfig?.protocolConfig
  };
}
