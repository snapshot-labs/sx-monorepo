import { utils } from '@snapshot-labs/sx';
import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNetwork, offchainNetworks, supportsNullCurrent } from '@/networks';
import { VotingPower } from '@/networks/types';
import { NetworkID, Proposal, Space } from '@/types';

export type VotingPowerItem = {
  votingPowers: VotingPower[];
  symbol: string;
  canVote: boolean;
};

type Snapshot = Proposal['snapshot'] | null;

type SpaceLike = Pick<
  Space,
  'id' | 'network' | 'snapshot_chain_id' | 'voting_power_symbol'
>;

const CACHE_TTL = 1000 * 60;

const VOTING_POWER_KEYS = {
  space: (
    block: MaybeRefOrGetter<Snapshot>,
    spaceId: MaybeRefOrGetter<string>
  ) =>
    ['votingPower', toRef(() => web3.value.account), block, spaceId] as const,
  proposal: (
    block: MaybeRefOrGetter<Snapshot>,
    spaceId: MaybeRefOrGetter<string>,
    proposalId: MaybeRefOrGetter<string>
  ) => [...VOTING_POWER_KEYS.space(block, spaceId), proposalId] as const
};

const { web3 } = useWeb3();

function isOffchainPendingProposal(proposal: Proposal): boolean {
  return (
    proposal.state === 'pending' && offchainNetworks.includes(proposal.network)
  );
}

function getProposalSnapshot(proposal: Proposal | null | undefined): Snapshot {
  if (!proposal) return null;

  const snapshot = isOffchainPendingProposal(proposal)
    ? null
    : proposal.snapshot;

  return snapshot || getLatestBlock(proposal.network);
}

function getLatestBlock(network: NetworkID): Snapshot {
  const { getCurrent } = useMetaStore();

  return supportsNullCurrent(network) ? null : getCurrent(network) || 0;
}

async function getVotingPower(
  block: Snapshot,
  space: SpaceLike,
  strategies: [
    Proposal['strategies'],
    Proposal['strategies_params'],
    Proposal['space']['strategies_parsed_metadata']
  ]
) {
  try {
    const network = getNetwork(space.network);
    const vp = await network.actions.getVotingPower(
      space.id,
      ...strategies,
      web3.value.account,
      {
        at: block,
        chainId: space.snapshot_chain_id
      }
    );

    return {
      symbol: space.voting_power_symbol,
      votingPowers: vp,
      canVote: vp.some(vp => vp.value > 0n)
    };
  } catch (e: any) {
    if (
      e instanceof utils.errors.VotingPowerDetailsError &&
      e.details === 'NOT_READY_YET' &&
      ['evmSlotValue', 'ozVotesStorageProof'].includes(e.source)
    ) {
      throw new Error('NOT_READY_YET');
    }
    throw e;
  }
}

function isLoggedIn() {
  return !!web3.value.account && !web3.value.authLoading;
}

export function useSpaceVotingPowerQuery(space: MaybeRefOrGetter<Space>) {
  return useQuery({
    queryKey: VOTING_POWER_KEYS.space(
      toRef(() => getLatestBlock(toValue(space).network)),
      toRef(() => toValue(space).id)
    ),
    queryFn: async () => {
      const spaceValue = toValue(space);

      return getVotingPower(getLatestBlock(spaceValue.network), spaceValue, [
        spaceValue.strategies,
        spaceValue.strategies_params,
        spaceValue.strategies_parsed_metadata
      ]);
    },
    enabled: () => isLoggedIn(),
    staleTime: CACHE_TTL
  });
}

export function useProposalVotingPowerQuery(
  proposal: MaybeRefOrGetter<Proposal | null | undefined>
) {
  return useQuery({
    queryKey: VOTING_POWER_KEYS.proposal(
      toRef(() => getProposalSnapshot(toValue(proposal))),
      toRef(() => toValue(proposal)?.space?.id || ''),
      toRef(() => toValue(proposal)?.id || '')
    ),
    queryFn: async () => {
      const proposalValue = toValue(proposal);

      if (!proposalValue) return;

      return getVotingPower(
        getProposalSnapshot(toValue(proposal)),
        {
          ...proposalValue.space,
          network: proposalValue.network
        },
        [
          proposalValue.strategies,
          proposalValue.strategies_params,
          proposalValue.space.strategies_parsed_metadata
        ]
      );
    },
    enabled: () => isLoggedIn() && toValue(proposal)?.state === 'active',
    staleTime: CACHE_TTL
  });
}
