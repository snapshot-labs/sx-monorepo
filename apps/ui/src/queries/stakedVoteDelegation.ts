import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  findMemberships,
  getDelegatee,
  getIsStaker,
  getValidatorConfig,
  GOVERNANCE_SPACES,
  isValidStarknetAddress,
  Membership,
  normalizeAddress,
  resolvePoolMember,
  STAKED_DELEGATION_NETWORK
} from '@/helpers/stakedVoteDelegation';
import {
  loadVotingRecords,
  pickRecentProposals
} from '@/helpers/stakedVoteDelegation/votingRecord';
import { useProposalsSummaryQuery } from '@/queries/proposals';

export const stakedDelegationKeys = {
  all: ['stakedDelegation', STAKED_DELEGATION_NETWORK] as const,
  delegatee: (address: MaybeRefOrGetter<string>) =>
    [...stakedDelegationKeys.all, 'delegatee', address] as const,
  validatorConfig: (staker: MaybeRefOrGetter<string>) =>
    [...stakedDelegationKeys.all, 'validatorConfig', staker] as const,
  isStaker: (address: MaybeRefOrGetter<string>) =>
    [...stakedDelegationKeys.all, 'isStaker', address] as const,
  memberships: (address: MaybeRefOrGetter<string>) =>
    [...stakedDelegationKeys.all, 'memberships', address] as const,
  votingRecords: (voters: MaybeRefOrGetter<string[]>, proposals: unknown) =>
    ['stakedDelegation', 'votingRecords', voters, proposals] as const
};

function isEnabled(address: MaybeRefOrGetter<string>) {
  const value = toValue(address);
  return !!value && isValidStarknetAddress(value);
}

export function useStakedDelegateeQuery(address: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: stakedDelegationKeys.delegatee(address),
    queryFn: () => getDelegatee(normalizeAddress(toValue(address))),
    enabled: () => isEnabled(address)
  });
}

export function useValidatorConfigQuery(staker: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: stakedDelegationKeys.validatorConfig(staker),
    queryFn: () => getValidatorConfig(normalizeAddress(toValue(staker))),
    enabled: () => isEnabled(staker),
    staleTime: 60_000
  });
}

export function useIsStakerQuery(address: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: stakedDelegationKeys.isStaker(address),
    queryFn: () => getIsStaker(normalizeAddress(toValue(address))),
    enabled: () => isEnabled(address),
    staleTime: 5 * 60_000
  });
}

/**
 * Pools the address delegates to, and who votes with each of them under the
 * SNIP resolution rules.
 */
export function useMembershipsQuery(address: MaybeRefOrGetter<string>) {
  const progress = ref({ done: 0, total: 0 });

  const query = useQuery({
    queryKey: stakedDelegationKeys.memberships(address),
    queryFn: async (): Promise<Membership[]> => {
      const member = normalizeAddress(toValue(address));
      progress.value = { done: 0, total: 0 };

      const [delegatee, pools] = await Promise.all([
        getDelegatee(member),
        findMemberships(member, (done, total) => {
          progress.value = { done, total };
        })
      ]);

      return Promise.all(
        pools.map(async ({ validator, amount }) => {
          const config = await getValidatorConfig(validator.staker);
          return {
            validator,
            amount,
            config,
            ...resolvePoolMember(member, validator.staker, delegatee, config)
          };
        })
      );
    },
    enabled: () => isEnabled(address),
    staleTime: 60_000
  });

  return { ...query, progress };
}

/**
 * How each address voted on the most recent Starknet votes and polls.
 * Returns a map keyed by lowercased address.
 */
export function useVotingRecordsQuery(voters: MaybeRefOrGetter<string[]>) {
  const [voteSpace, pollSpace] = GOVERNANCE_SPACES;
  const { data: votes, isPending: isVotesPending } = useProposalsSummaryQuery(
    voteSpace.network,
    voteSpace.id
  );
  const { data: polls, isPending: isPollsPending } = useProposalsSummaryQuery(
    pollSpace.network,
    pollSpace.id
  );

  const proposals = computed(() =>
    pickRecentProposals(votes.value, polls.value)
  );
  const sortedVoters = computed(() =>
    [...new Set(toValue(voters).map(v => v.toLowerCase()))].sort()
  );

  return useQuery({
    queryKey: stakedDelegationKeys.votingRecords(
      sortedVoters,
      computed(() => proposals.value.map(p => `${p.network}:${p.id}`))
    ),
    queryFn: () => loadVotingRecords(sortedVoters.value, proposals.value),
    enabled: () =>
      !isVotesPending.value &&
      !isPollsPending.value &&
      sortedVoters.value.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: previous => previous
  });
}
