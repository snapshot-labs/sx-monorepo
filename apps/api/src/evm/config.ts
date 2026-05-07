import { evmNetworks } from '@snapshot-labs/sx';
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
    snapshotXConfig: snapshotXConfig.protocolConfig,
    governorBravoConfig: governorBravoConfig?.protocolConfig,
    openZeppelinConfig: openZeppelinConfig?.protocolConfig
  };
}
