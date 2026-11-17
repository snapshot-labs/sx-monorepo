import { reactive } from 'vue';
import { getNetwork, metadataNetwork } from '@/networks';
import { METADATA as EVM_METADATA } from '@/networks/evm/metadata';
import { METADATA as STARKNET_METADATA } from '@/networks/starknet/metadata';
import { ChainId } from '@/types';

type NetworkDetails = {
  name: string;
  logo: string;
  explorerUrl: string;
};

// Chains of onchain networks are known without the hub
const BUILTIN_NETWORKS = new Map<string, NetworkDetails>(
  [...Object.values(EVM_METADATA), ...Object.values(STARKNET_METADATA)]
    .filter(metadata => metadata !== undefined)
    .map(({ chainId, name, avatar, explorerUrl }) => [
      String(chainId),
      { name, logo: avatar, explorerUrl }
    ])
);

const hubNetworks = reactive(new Map<string, NetworkDetails>());
let isRequested = false;

// Other chains are only used by offchain spaces, they are loaded from the hub
// the first time one is needed so pages without them never wait on it
function requestHubNetworks() {
  if (isRequested) return;
  isRequested = true;

  getNetwork(metadataNetwork)
    .api.getNetworks()
    .then(networks => {
      for (const { id, name, logo, explorer } of networks) {
        hubNetworks.set(id, { name, logo, explorerUrl: explorer });
      }
    })
    .catch(() => {
      isRequested = false;
    });
}

export function getNetworkDetails(chainId: ChainId): NetworkDetails | null {
  const builtin = BUILTIN_NETWORKS.get(String(chainId));
  if (builtin) return builtin;

  requestHubNetworks();

  return hubNetworks.get(String(chainId)) ?? null;
}
