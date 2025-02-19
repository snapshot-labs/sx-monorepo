import {
  QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNames } from '@/helpers/stamp';
import { getNetwork } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { NetworkID, Proposal } from '@/types';

type Filters = {
  state?: MaybeRefOrGetter<NonNullable<ProposalsFilter['state']>>;
  labels?: MaybeRefOrGetter<string[]>;
};

export const PROPOSALS_LIMIT = 20;
export const PROPOSALS_SUMMARY_LIMIT = 6;

export const PROPOSALS_KEYS = {
  all: ['proposals'] as const,
  space: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>
  ) => [...PROPOSALS_KEYS.all, networkId, spaceId] as const,
  spaceSummary: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>
  ) => [...PROPOSALS_KEYS.space(networkId, spaceId), 'summary'] as const,
  spaceList: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>,
    filters: Filters,
    query?: MaybeRefOrGetter<string>
  ) =>
    [
      ...PROPOSALS_KEYS.space(networkId, spaceId),
      'list',
      { ...filters, query }
    ] as const,
  details: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>
  ) => [...PROPOSALS_KEYS.space(networkId, spaceId), 'detail'] as const,
  detail: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>,
    proposalId: MaybeRefOrGetter<string>
  ) => [...PROPOSALS_KEYS.details(networkId, spaceId), proposalId] as const
};

async function withAuthorNames(proposals: Proposal[]) {
  const names = await getNames(proposals.map(proposal => proposal.author.id));

  return proposals.map(proposal => {
    proposal.author.name = names[proposal.author.id];

    return proposal;
  });
}

function setProposalsDetails(
  queryClient: QueryClient,
  networkId: NetworkID,
  spaceId: string,
  proposals: Proposal[]
) {
  for (const proposal of proposals) {
    queryClient.setQueryData(
      PROPOSALS_KEYS.detail(
        networkId,
        spaceId,
        proposal.proposal_id.toString()
      ),
      proposal
    );
  }
}

async function getProposals(
  spaceId: string,
  networkId: NetworkID,
  { limit, skip }: { limit: number; skip: number },
  filters?: ProposalsFilter,
  query?: string
) {
  const metaStore = useMetaStore();
  await metaStore.fetchBlock(networkId);

  return withAuthorNames(
    await getNetwork(networkId).api.loadProposals(
      [spaceId],
      {
        limit,
        skip
      },
      metaStore.getCurrent(networkId) || 0,
      filters,
      query
    )
  );
}

export function useProposalsQuery(
  networkId: MaybeRefOrGetter<NetworkID>,
  spaceId: MaybeRefOrGetter<string>,
  filters: Filters,
  query?: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: PROPOSALS_KEYS.spaceList(networkId, spaceId, filters, query),
    queryFn: async ({ pageParam = 0 }) => {
      const proposals = await getProposals(
        toValue(spaceId),
        toValue(networkId),
        {
          limit: PROPOSALS_LIMIT,
          skip: pageParam
        },
        {
          state: toValue(filters.state),
          labels: toValue(filters.labels)
        },
        toValue(query)
      );

      setProposalsDetails(
        queryClient,
        toValue(networkId),
        toValue(spaceId),
        proposals
      );

      return proposals;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PROPOSALS_LIMIT) return null;

      return pages.length * PROPOSALS_LIMIT;
    }
  });
}

export function useProposalsSummaryQuery(
  networkId: MaybeRefOrGetter<NetworkID>,
  spaceId: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: PROPOSALS_KEYS.spaceSummary(networkId, spaceId),
    queryFn: async () => {
      const proposals = await getProposals(
        toValue(spaceId),
        toValue(networkId),
        {
          skip: 0,
          limit: PROPOSALS_SUMMARY_LIMIT
        }
      );

      setProposalsDetails(
        queryClient,
        toValue(networkId),
        toValue(spaceId),
        proposals
      );

      return proposals;
    }
  });
}

export function useProposalQuery(
  networkId: MaybeRefOrGetter<NetworkID>,
  spaceId: MaybeRefOrGetter<string>,
  proposalId: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: PROPOSALS_KEYS.detail(networkId, spaceId, proposalId),
    queryFn: async () => {
      const networkIdValue = toValue(networkId);

      const metaStore = useMetaStore();
      await metaStore.fetchBlock(networkIdValue);

      const proposal = await getNetwork(networkIdValue).api.loadProposal(
        toValue(spaceId),
        toValue(proposalId),
        metaStore.getCurrent(networkIdValue) || 0
      );
      if (!proposal) return null;

      return (await withAuthorNames([proposal]))[0];
    }
  });
}
