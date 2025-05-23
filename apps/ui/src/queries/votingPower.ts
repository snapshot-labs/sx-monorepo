import { utils } from '@snapshot-labs/sx';
import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNetwork, offchainNetworks } from '@/networks';
import { VotingPower } from '@/networks/types';
import { Proposal, Space } from '@/types';

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
    account: MaybeRefOrGetter<string>,
    block: MaybeRefOrGetter<Snapshot>,
    spaceId: MaybeRefOrGetter<string>
  ) => ['votingPower', account, block, spaceId] as const,
  proposal: (
    account: MaybeRefOrGetter<string>,
    block: MaybeRefOrGetter<Snapshot>,
    spaceId: MaybeRefOrGetter<string>,
    proposalId: MaybeRefOrGetter<string>
  ) =>
    [...VOTING_POWER_KEYS.space(account, block, spaceId), proposalId] as const
};

const { web3 } = useWeb3();

function isOnchainPendingProposal(proposal: Proposal): boolean {
  return (
    proposal.state === 'pending' && !offchainNetworks.includes(proposal.network)
  );
}

function getProposalSnapshot(proposal?: Proposal | null): Snapshot {
  if (!proposal) return null;

  const snapshot = isOnchainPendingProposal(proposal)
    ? null
    : proposal.snapshot;

  return snapshot || null;
}

async function getVotingPower(
  block: Snapshot,
  space: SpaceLike,
  strategiesData: [
    Proposal['strategies'],
    Proposal['strategies_params'],
    Proposal['space']['strategies_parsed_metadata']
  ]
): Promise<VotingPowerItem> {
  try {
    const network = getNetwork(space.network);
    const vp = await network.actions.getVotingPower(
      space.id,
      ...strategiesData,
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

export function useSpaceVotingPowerQuery(
  account: MaybeRefOrGetter<string>,
  space: MaybeRefOrGetter<Space>
) {
  return useQuery({
    queryKey: VOTING_POWER_KEYS.space(
      toRef(() => toValue(account)),
      null,
      toRef(() => toValue(space).id)
    ),
    queryFn: async () => {
      const spaceValue = toValue(space);

      return getVotingPower(null, spaceValue, [
        spaceValue.strategies,
        spaceValue.strategies_params,
        spaceValue.strategies_parsed_metadata
      ]);
    },
    retry: (failureCount, error) => {
      if (error?.message.includes('NOT_READY_YET')) return false;

      return failureCount < 3;
    },
    enabled: () => !!toValue(account),
    staleTime: CACHE_TTL
  });
}

export function useProposalVotingPowerQuery(
  account: MaybeRefOrGetter<string>,
  proposal: MaybeRefOrGetter<Proposal | null | undefined>,
  active: MaybeRefOrGetter<boolean>
) {
  return useQuery({
    queryKey: VOTING_POWER_KEYS.proposal(
      toRef(() => toValue(account)),
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
    retry: (failureCount, error) => {
      if (error?.message.includes('NOT_READY_YET')) return false;

      return failureCount < 3;
    },
    enabled: () => !!toValue(account) && toValue(active),
    staleTime: CACHE_TTL
  });
}
