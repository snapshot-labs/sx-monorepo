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
  followedSpacesList: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spacesIds: MaybeRefOrGetter<string[]>,
    filters: Filters,
    query?: MaybeRefOrGetter<string>
  ) =>
    [
      ...PROPOSALS_KEYS.all,
      'followedList',
      networkId,
      spacesIds,
      { ...filters, query }
    ] as const,
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
  proposals: Proposal[]
) {
  for (const proposal of proposals) {
    queryClient.setQueryData(
      PROPOSALS_KEYS.detail(
        networkId,
        proposal.space.id,
        proposal.proposal_id.toString()
      ),
      proposal
    );
  }
}

async function getProposals(
  spaceIds: string[],
  networkId: NetworkID,
  { limit, skip }: { limit: number; skip: number },
  filters?: ProposalsFilter,
  query?: string
) {
  const metaStore = useMetaStore();
  await metaStore.fetchBlock(networkId);

  if (spaceIds.length === 0) return [];

  // Get proposals from API
  const apiProposals = await getNetwork(networkId).api.loadProposals(
    spaceIds,
    {
      limit,
      skip
    },
    metaStore.getCurrent(networkId) || 0,
    filters,
    query
  );

  // Get local proposals from localStorage
  const localProposals: Proposal[] = [];
  for (const spaceId of spaceIds) {
    console.log('🔍 Checking proposals for spaceId:', spaceId);

    // Try both formats: with and without s: prefix
    const spaceIdWithoutPrefix = spaceId.startsWith('s:')
      ? spaceId.slice(2)
      : spaceId;
    const spaceIdWithPrefix = spaceId.startsWith('s:')
      ? spaceId
      : `s:${spaceId}`;

    console.log('🔍 spaceIdWithoutPrefix:', spaceIdWithoutPrefix);
    console.log('🔍 spaceIdWithPrefix:', spaceIdWithPrefix);

    // Try the format used when storing (contract address without prefix)
    const localKey1 = `localProposals:${spaceIdWithoutPrefix}`;
    const spaceLocalProposals1 = JSON.parse(
      localStorage.getItem(localKey1) || '[]'
    );
    console.log(
      '🔍 localKey1:',
      localKey1,
      'proposals found:',
      spaceLocalProposals1.length
    );

    // Try the format with prefix as fallback
    const localKey2 = `localProposals:${spaceIdWithPrefix}`;
    const spaceLocalProposals2 = JSON.parse(
      localStorage.getItem(localKey2) || '[]'
    );
    console.log(
      '🔍 localKey2:',
      localKey2,
      'proposals found:',
      spaceLocalProposals2.length
    );

    // Combine both (they should be mutually exclusive)
    localProposals.push(...spaceLocalProposals1, ...spaceLocalProposals2);
  }

  console.log('🔍 Total local proposals found:', localProposals.length);

  // Combine and sort proposals (local proposals first, then API proposals)
  const allProposals = [...localProposals, ...apiProposals];
  console.log(
    '🔍 Combined proposals - local:',
    localProposals.length,
    'API:',
    apiProposals.length,
    'total:',
    allProposals.length
  );

  // Apply filters to local proposals if needed
  let filteredProposals = allProposals;
  if (filters?.state && filters.state !== 'any') {
    filteredProposals = allProposals.filter(
      proposal => proposal.state === filters.state
    );
    console.log(
      '🔍 After state filter:',
      filteredProposals.length,
      'proposals (filter:',
      filters.state,
      ')'
    );
  } else {
    console.log('🔍 No state filter applied (filter:', filters?.state, ')');
  }
  if (filters?.labels && filters.labels.length > 0) {
    filteredProposals = filteredProposals.filter(proposal =>
      proposal.labels?.some(label => filters.labels!.includes(label))
    );
    console.log(
      '🔍 After labels filter:',
      filteredProposals.length,
      'proposals'
    );
  }
  if (query) {
    const queryLower = query.toLowerCase();
    filteredProposals = filteredProposals.filter(
      proposal =>
        proposal.title?.toLowerCase().includes(queryLower) ||
        proposal.body?.toLowerCase().includes(queryLower)
    );
    console.log(
      '🔍 After query filter:',
      filteredProposals.length,
      'proposals (query:',
      query,
      ')'
    );
  }

  // Apply pagination
  const paginatedProposals = filteredProposals.slice(skip, skip + limit);
  console.log(
    '🔍 After pagination:',
    paginatedProposals.length,
    'proposals (skip:',
    skip,
    'limit:',
    limit,
    ')'
  );

  const result = await withAuthorNames(paginatedProposals);
  console.log('🔍 Final result:', result.length, 'proposals');
  return result;
}

function getProposalsQuery(
  queryKey: Parameters<typeof useInfiniteQuery>[0]['queryKey'],
  networkId: MaybeRefOrGetter<NetworkID>,
  spacesIds: MaybeRefOrGetter<string[]>,
  filters: Filters,
  query?: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const proposals = await getProposals(
        toValue(spacesIds),
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

      setProposalsDetails(queryClient, toValue(networkId), proposals);

      return proposals;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PROPOSALS_LIMIT) return null;

      return pages.length * PROPOSALS_LIMIT;
    }
  });
}

// TODO: Support multiple networks
export function useHomeProposalsQuery(
  networkId: MaybeRefOrGetter<NetworkID>,
  spacesIds: MaybeRefOrGetter<string[]>,
  filters: Filters,
  query?: MaybeRefOrGetter<string>
) {
  return getProposalsQuery(
    PROPOSALS_KEYS.followedSpacesList(networkId, spacesIds, filters, query),
    networkId,
    spacesIds,
    filters,
    query
  );
}

export function useProposalsQuery(
  networkId: MaybeRefOrGetter<NetworkID>,
  spaceId: MaybeRefOrGetter<string>,
  filters: Filters,
  query?: MaybeRefOrGetter<string>
) {
  return getProposalsQuery(
    PROPOSALS_KEYS.spaceList(networkId, spaceId, filters, query),
    networkId,
    toRef(() => [toValue(spaceId)]),
    filters,
    query
  );
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
        [toValue(spaceId)],
        toValue(networkId),
        {
          skip: 0,
          limit: PROPOSALS_SUMMARY_LIMIT
        }
      );

      setProposalsDetails(queryClient, toValue(networkId), proposals);

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
      const spaceIdValue = toValue(spaceId);
      const proposalIdValue = toValue(proposalId);

      // LocalStorage logic: for fetching local proposals
      const spaceIdWithoutPrefix = spaceIdValue.startsWith('s:')
        ? spaceIdValue.slice(2)
        : spaceIdValue;
      const spaceIdWithPrefix = spaceIdValue.startsWith('s:')
        ? spaceIdValue
        : `s:${spaceIdValue}`;

      console.log('🔍 useProposalQuery - spaceIdValue:', spaceIdValue);
      console.log(
        '🔍 useProposalQuery - spaceIdWithoutPrefix:',
        spaceIdWithoutPrefix
      );
      console.log(
        '🔍 useProposalQuery - spaceIdWithPrefix:',
        spaceIdWithPrefix
      );

      // Try the format used when storing (contract address without prefix)
      const localKey1 = `localProposals:${spaceIdWithoutPrefix}`;
      const localProposals1 = JSON.parse(
        localStorage.getItem(localKey1) || '[]'
      );
      const localProposal1 = localProposals1.find(
        (p: any) =>
          p.id === proposalIdValue || p.ggp?.toString() === proposalIdValue
      );
      console.log(
        '🔍 useProposalQuery - localKey1:',
        localKey1,
        'proposals found:',
        localProposals1.length
      );

      // Try the format with prefix as fallback
      const localKey2 = `localProposals:${spaceIdWithPrefix}`;
      const localProposals2 = JSON.parse(
        localStorage.getItem(localKey2) || '[]'
      );
      const localProposal2 = localProposals2.find(
        (p: any) =>
          p.id === proposalIdValue || p.ggp?.toString() === proposalIdValue
      );
      console.log(
        '🔍 useProposalQuery - localKey2:',
        localKey2,
        'proposals found:',
        localProposals2.length
      );

      const localProposal = localProposal1 || localProposal2;

      if (localProposal) {
        console.log(
          '🔍 useProposalQuery - Found local proposal:',
          localProposal
        );
        return (await withAuthorNames([localProposal]))[0];
      }

      const metaStore = useMetaStore();
      await metaStore.fetchBlock(networkIdValue);

      const proposal = await getNetwork(networkIdValue).api.loadProposal(
        spaceIdValue,
        proposalIdValue,
        metaStore.getCurrent(networkIdValue) || 0
      );
      if (!proposal) return null;

      return (await withAuthorNames([proposal]))[0];
    }
  });
}
