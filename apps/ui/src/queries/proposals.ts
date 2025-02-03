import {
  QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRef } from 'vue';
import { getNames } from '@/helpers/stamp';
import { getNetwork } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { NetworkID, Proposal } from '@/types';

type Filters = {
  state?: MaybeRef<NonNullable<ProposalsFilter['state']>>;
  labels?: MaybeRef<string[]>;
};

export const PROPOSALS_LIMIT = 20;
export const PROPOSALS_SUMMARY_LIMIT = 6;

export const PROPOSALS_KEYS = {
  all: ['proposals'] as const,
  space: (networkId: NetworkID, spaceId: string) =>
    [...PROPOSALS_KEYS.all, `${networkId}:${spaceId}`] as const,
  spaceSummary: (networkId: NetworkID, spaceId: string) =>
    [...PROPOSALS_KEYS.space(networkId, spaceId), 'summary'] as const,
  spaceList: (
    networkId: NetworkID,
    spaceId: string,
    filters: Filters,
    query?: MaybeRef<string>
  ) =>
    [
      ...PROPOSALS_KEYS.space(networkId, spaceId),
      'list',
      { ...filters, query }
    ] as const,
  details: (networkId: NetworkID, spaceId: string) =>
    [...PROPOSALS_KEYS.space(networkId, spaceId), 'detail'] as const,
  detail: (
    networkId: NetworkID,
    spaceId: string,
    proposalId: MaybeRef<string>
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
  networkId: NetworkID,
  spaceId: string,
  filters: Filters,
  query?: MaybeRef<string>
) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: PROPOSALS_KEYS.spaceList(networkId, spaceId, filters, query),
    queryFn: async ({ pageParam = 0 }) => {
      const proposals = await getProposals(
        spaceId,
        networkId,
        {
          limit: PROPOSALS_LIMIT,
          skip: pageParam
        },
        {
          state: unref(filters.state),
          labels: unref(filters.labels)
        },
        unref(query)
      );

      setProposalsDetails(queryClient, networkId, spaceId, proposals);

      return proposals;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PROPOSALS_LIMIT) return null;

      return pages.length * PROPOSALS_LIMIT;
    }
  });
}

export function useProposalsSummaryQuery(
  networkId: NetworkID,
  spaceId: string
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: PROPOSALS_KEYS.spaceSummary(networkId, spaceId),
    queryFn: async () => {
      const proposals = await getProposals(spaceId, networkId, {
        skip: 0,
        limit: PROPOSALS_SUMMARY_LIMIT
      });

      setProposalsDetails(queryClient, networkId, spaceId, proposals);

      return proposals;
    }
  });
}

export function useProposalQuery(
  networkId: NetworkID,
  spaceId: string,
  proposalId: MaybeRef<string>
) {
  return useQuery({
    queryKey: PROPOSALS_KEYS.detail(networkId, spaceId, proposalId),
    queryFn: async () => {
      const metaStore = useMetaStore();
      await metaStore.fetchBlock(networkId);

      const proposal = await getNetwork(networkId).api.loadProposal(
        spaceId,
        unref(proposalId),
        metaStore.getCurrent(networkId) || 0
      );
      if (!proposal) return null;

      return (await withAuthorNames([proposal]))[0];
    }
  });
}
