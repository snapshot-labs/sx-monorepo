import { evmNetworks } from '@snapshot-labs/sx';
import { createConfig as createGovernorBravoConfig } from './protocols/governorBravo/config';
import { createConfig as createSnapshotXConfig } from './protocols/snapshotX/config';
import { EVMConfig, NetworkID, Protocols } from './types';

export function createConfig(
  indexerName: NetworkID,
  protocols: Protocols
): EVMConfig {
  const network = evmNetworks[indexerName];

  let snapshotXConfig: ReturnType<typeof createSnapshotXConfig> | null = null;
  let governorBravoConfig: ReturnType<typeof createGovernorBravoConfig> | null =
    null;

  let sources: EVMConfig['sources'] = [];
  let templates: EVMConfig['templates'] = {};
  let abis: EVMConfig['abis'] = {};

  if (protocols.snapshotX) {
    snapshotXConfig = createSnapshotXConfig(indexerName);
    sources = [...sources, ...(snapshotXConfig.sources ?? [])];
    templates = { ...templates, ...snapshotXConfig.templates };
    abis = { ...abis, ...snapshotXConfig.abis };
  }

  if (protocols.governorBravo) {
    governorBravoConfig = createGovernorBravoConfig(indexerName);
    sources = [...sources, ...(governorBravoConfig?.sources ?? [])];
    templates = { ...templates, ...governorBravoConfig?.templates };
    abis = { ...abis, ...governorBravoConfig?.abis };
  }

  return {
    indexerName,
    network_node_url: `https://rpc.snapshot.org/${network.Meta.eip712ChainId}`,
    sources,
    templates,
    abis,
    snapshotXConfig: snapshotXConfig?.protocolConfig,
    governorBravoConfig: governorBravoConfig?.protocolConfig
  };
}
