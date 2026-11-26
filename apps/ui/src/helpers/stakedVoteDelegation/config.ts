import { constants as starknetConstants } from 'starknet';
import { getOrganizationConfigById } from '@/helpers/organizations/config';
import sepoliaPools from './pools.sn-sep.json';
import mainnetPools from './pools.sn.json';

/**
 * Staked STRK vote delegation (draft SNIP).
 * @see https://github.com/starknet-innovation/staked-strk-vote-delegation
 */

export type StakedDelegationNetworkId = 'sn' | 'sn-sep';

export type ValidatorPool = {
  staker: string;
  pool: string;
  /** Display name, when known. */
  name?: string;
  /** STRK delegated to the pool, in wei (string to keep bigint precision). */
  delegated: string;
  /** Validator self-stake, in wei. */
  own: string;
  /** Commission in basis points (e.g. 500 = 5%). */
  commission: number | null;
  exiting: boolean;
  /** Share of epochs attested in the liveness window (0–1). */
  liveness?: number;
};

export type PoolsSnapshot = {
  network: StakedDelegationNetworkId;
  block: number;
  generatedAt: string;
  staking: string;
  token: string;
  /** Window used for `liveness`. */
  liveness?: { days: number; epochs: number };
  validators: ValidatorPool[];
};

type NetworkConfig = {
  name: string;
  chainId: starknetConstants.StarknetChainId;
  /** Registry address. `null` until it is deployed on that network. */
  registry: string | null;
  staking: string;
  explorerUrl: string;
  pools: PoolsSnapshot;
};

export const STAKED_DELEGATION_NETWORKS: Record<
  StakedDelegationNetworkId,
  NetworkConfig
> = {
  sn: {
    name: 'Starknet',
    chainId: starknetConstants.StarknetChainId.SN_MAIN,
    registry: null,
    staking:
      '0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7',
    explorerUrl: 'https://voyager.online',
    pools: mainnetPools as PoolsSnapshot
  },
  'sn-sep': {
    name: 'Starknet Sepolia',
    chainId: starknetConstants.StarknetChainId.SN_SEPOLIA,
    // Prototype deployment of staked-strk-vote-delegation@e788c48
    registry:
      '0x07c1db3e8a9137063d364c84c2175d323ed75b1a7e4fd457cca81aa99ecec55f',
    staking:
      '0x03745ab04a431fc02871a139be6b93d9260b0ff3e779ad9c8b377183b23109f1',
    explorerUrl: 'https://sepolia.voyager.online',
    pools: sepoliaPools as PoolsSnapshot
  }
};

/**
 * Starknet's governance spaces, as listed in its organization config: the
 * Snapshot X space (votes) and the Snapshot space (polls). The SNIP changes
 * the voting power of both.
 */
const starknetSpaces = getOrganizationConfigById('starknet')?.spaceIds ?? [];
const voteSpace = starknetSpaces.find(
  (space): space is { network: StakedDelegationNetworkId; id: string } =>
    space.network in STAKED_DELEGATION_NETWORKS
);
const pollSpace = starknetSpaces.find(
  space => space.network === 's' || space.network === 's-tn'
);
if (!voteSpace || !pollSpace) {
  throw new Error('Starknet organization config is missing its spaces');
}

/** Spaces whose voting power the SNIP changes. */
export const GOVERNANCE_SPACES = [
  { network: voteSpace.network, id: voteSpace.id, kind: 'Vote' },
  { network: pollSpace.network, id: pollSpace.id, kind: 'Poll' }
] as const;

/** The registry is used on the network of Starknet's Snapshot X space. */
export const STAKED_DELEGATION_NETWORK: StakedDelegationNetworkId =
  voteSpace.network;

export const SNIP_URL =
  'https://github.com/starknet-innovation/staked-strk-vote-delegation/blob/main/snip/snip-staked-vote-delegation.md';

export function getStakedDelegationConfig(
  networkId: StakedDelegationNetworkId = STAKED_DELEGATION_NETWORK
) {
  return STAKED_DELEGATION_NETWORKS[networkId];
}
