import { useInfiniteQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNetwork } from '@/networks';
import { Proposal } from '@/types';

const LIMIT = 20;

export function useProposalVotesQuery({
  proposal,
  choiceFilter,
  sortBy,
  enabled
}: {
  proposal: MaybeRefOrGetter<Proposal>;
  choiceFilter: MaybeRefOrGetter<'any' | 'for' | 'against' | 'abstain'>;
  sortBy: MaybeRefOrGetter<
    'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc'
  >;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: [
      'votes',
      () => toValue(proposal).id,
      'list',
      {
        choiceFilter,
        sortBy
      }
    ],
    queryFn: async ({ pageParam }) => {
      const network = getNetwork(toValue(proposal).network);

      return network.api.loadProposalVotes(
        toValue(proposal),
        { limit: LIMIT, skip: pageParam },
        toValue(choiceFilter),
        toValue(sortBy)
      );
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < LIMIT) return null;

      return pages.length * LIMIT;
    },
    enabled: enabled ? () => toValue(enabled) : undefined
  });
}
