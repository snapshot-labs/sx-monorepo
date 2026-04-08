import { enabledNetworks, evmNetworks } from '@/networks';
import { METADATA } from '@/networks/starknet/metadata';
import { ChainId, NetworkID, SpaceMetadataDelegation } from '@/types';
import { getChainIdKind } from './utils';

export function getDelegationNetwork(chainId: ChainId) {
  // NOTE: any EVM network can be used for delegation on EVMs (it will switch chainId as needed).
  // This will also support networks that are not supported natively.
  const evmNetwork = enabledNetworks.find(networkId =>
    evmNetworks.includes(networkId)
  );

  const isEvm = getChainIdKind(chainId) === 'evm';
  const actionNetwork = isEvm
    ? evmNetwork
    : (Object.entries(METADATA).find(
        ([, metadata]) => metadata.chainId === chainId
      )?.[0] as NetworkID);
  if (!actionNetwork) throw new Error('Failed to detect action network');

  return actionNetwork;
}

export type ValidSpaceMetadataDelegation = {
  [P in keyof SpaceMetadataDelegation]: P extends 'apiUrl'
    ? SpaceMetadataDelegation[P]
    : NonNullable<SpaceMetadataDelegation[P]>;
};

export function isValidDelegation(
  delegation: SpaceMetadataDelegation
): delegation is ValidSpaceMetadataDelegation {
  return !!(
    delegation.chainId &&
    delegation.apiType &&
    delegation.contractAddress
  );
}
