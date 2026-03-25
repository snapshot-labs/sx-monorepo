import { DELEGATION_TYPES_NAMES } from '@/helpers/constants';
import { enabledNetworks, evmNetworks } from '@/networks';
import { METADATA } from '@/networks/starknet';
import { ChainId, NetworkID, Space, SpaceMetadataDelegation } from '@/types';
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

function getErc20VotesDelegation(space: Space): SpaceMetadataDelegation | null {
  const erc20VotesStrategy = space.strategies_params.find(
    (s: any) => s.name === 'erc20-votes' && s.params?.address
  );
  if (!erc20VotesStrategy) return null;

  return {
    name: DELEGATION_TYPES_NAMES['governor-subgraph'],
    apiType: 'governor-subgraph',
    apiUrl: null,
    contractAddress: erc20VotesStrategy.params.address,
    chainId: erc20VotesStrategy.network || space.snapshot_chain_id || null
  };
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

export function getSpaceDelegations(space: Space): SpaceMetadataDelegation[] {
  if (space.delegations.length > 0) return space.delegations;

  const erc20VotesDelegation = getErc20VotesDelegation(space);
  return erc20VotesDelegation ? [erc20VotesDelegation] : [];
}
