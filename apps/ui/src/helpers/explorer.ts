import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork } from '@/networks';
import { METADATA as STARKNET_NETWORKS_METADATA } from '@/networks/starknet';
import { ChainId, NetworkID } from '@/types';

// NOTE: This function has to be outside regular utils as it imports from @/networks
// which would cause a circular dependency if it was in utils

export function getGenericExplorerUrl(
  chainId: ChainId,
  address: string,
  type: 'address' | 'token'
) {
  if (typeof chainId === 'number') {
    return `${networks[chainId].explorer.url}/${type}/${address}`;
  }

  const starknetNetwork = Object.entries(STARKNET_NETWORKS_METADATA).find(
    ([, { chainId: starknetChainId }]) => starknetChainId === chainId
  )?.[0];

  if (!starknetNetwork) return null;

  try {
    const network = getNetwork(starknetNetwork as NetworkID);
    return network.helpers.getExplorerUrl(address, type);
  } catch {
    return null;
  }
}