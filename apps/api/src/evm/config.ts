import { evmNetworks } from '@snapshot-labs/sx';
import { createConfig as createSnapshotXConfig } from './protocols/snapshotX/config';
import { EVMConfig, NetworkID } from './types';

export function createConfig(indexerName: NetworkID): EVMConfig {
  const network = evmNetworks[indexerName];

  const snapshotXConfig = createSnapshotXConfig(indexerName);

  return {
    indexerName,
    network_node_url: `https://rpc.snapshot.org/${network.Meta.eip712ChainId}`,
    sources: snapshotXConfig.sources,
    templates: snapshotXConfig.templates,
    abis: snapshotXConfig.abis,
    snapshotXConfig: snapshotXConfig.protocolConfig
  };
}
