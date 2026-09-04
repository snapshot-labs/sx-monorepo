import {
  keepPreviousData,
  skipToken,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { SPACE_CATEGORIES } from '@/helpers/constants';
import {
  getOrganizationConfigBySpace,
  OrganizationConfig
} from '@/helpers/organizations';
import {
  enabledNetworks,
  explorePageProtocols,
  getNetwork,
  offchainNetworks,
  onchainApiNetwork
} from '@/networks';
import { ExplorePageProtocol, SpacesFilter } from '@/networks/types';
import { NetworkID, Space } from '@/types';

type SpaceCategory = 'all' | (typeof SPACE_CATEGORIES)[number]['id'];

// NOTE: this is used for followed spaces
export async function getSpaces(filter?: SpacesFilter) {
  const results = await Promise.all(
    enabledNetworks.map(async id => {
      const network = getNetwork(id);

      const requestFilter = {
        ...filter
      };

      if (requestFilter?.id_in) {
        const filtered = requestFilter.id_in.filter(spaceId =>
          spaceId.startsWith(`${id}:`)
        );
        if (filtered.length === 0) return [];

        requestFilter.id_in = filtered.map(spaceId => spaceId.split(':')[1]);
      }

      return network.api.loadSpaces(
        {
          skip: 0,
          limit: 1000
        },
        requestFilter
      );
    })
  );

  return results.flat();
}

async function fetchSpaces(
  protocol: ExplorePageProtocol,
  filter?: SpacesFilter,
  skip = 0
) {
  const { limit } = explorePageProtocols[protocol];
  const { apiNetwork } = explorePageProtocols[protocol];

  const network = getNetwork(apiNetwork);

  return network.api.loadSpaces(
    {
      skip,
      limit
    },
    filter
  );
}

export function useFollowedSpacesQuery({
  followedSpacesIds
}: {
  followedSpacesIds: MaybeRefOrGetter<string[] | undefined>;
}) {
  const queryClient = useQueryClient();

  const queryFn = computed(() => {
    const ids = toValue(followedSpacesIds);

    if (!ids) return skipToken;

    return async (): Promise<Space[]> => {
      const [existingSpaces, unavailableIds] = ids.reduce(
        (acc, id) => {
          const existingData = queryClient.getQueryData<Space>([
            'spaces',
            'detail',
            id
          ]);

          if (existingData) {
            acc[0].push(existingData);
          } else {
            acc[1].push(id);
          }

          return acc;
        },
        [[], []] as [Space[], string[]]
      );

      const spaces = await getSpaces({
        id_in: unavailableIds
      });

      for (const space of spaces) {
        queryClient.setQueryData<Space>(
          ['spaces', 'detail', `${space.network}:${space.id}`],
          space
        );
      }

      return [...existingSpaces, ...spaces];
    };
  });

  return useQuery({
    queryKey: ['spaces', 'followedSpaces', followedSpacesIds],
    queryFn,
    placeholderData: keepPreviousData
  });
}

export function useSpaceQuery({
  networkId,
  spaceId
}: {
  networkId: MaybeRefOrGetter<NetworkID | null>;
  spaceId: MaybeRefOrGetter<string | null>;
}) {
  const metaStore = useMetaStore();

  return useQuery({
    queryKey: [
      'spaces',
      'detail',
      () => `${toValue(networkId)}:${toValue(spaceId)}`
    ],
    queryFn: async () => {
      const networkIdValue = toValue(networkId);
      const spaceIdValue = toValue(spaceId);

      if (!networkIdValue || !spaceIdValue) return null;

      await metaStore.fetchBlock(networkIdValue);
      const network = getNetwork(networkIdValue);

      return network.api.loadSpace(spaceIdValue);
    },
    enabled: () => toValue(networkId) !== null && toValue(spaceId) !== null
  });
}

export function useExploreSpacesQuery({
  protocol,
  network,
  category,
  controller,
  searchQuery
}: {
  protocol: MaybeRefOrGetter<ExplorePageProtocol>;
  network?: MaybeRefOrGetter<string>;
  category?: MaybeRefOrGetter<SpaceCategory>;
  controller?: MaybeRefOrGetter<string>;
  searchQuery?: MaybeRefOrGetter<string | undefined>;
}) {
  const queryClient = useQueryClient();
  const protocolConfig = computed(
    () => explorePageProtocols[toValue(protocol)]
  );

  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: [
      'spaces',
      'list',
      {
        protocol,
        network,
        category,
        controller,
        searchQuery
      }
    ],
    queryFn: async ({ pageParam }) => {
      const filters: SpacesFilter = {};
      if (protocolConfig.value.protocols) {
        filters.protocol_in = protocolConfig.value.protocols;
      } else {
        filters.protocol = toValue(protocol);
      }
      if (network) filters.network = toValue(network);
      if (category) filters.category = toValue(category);
      if (searchQuery) filters.searchQuery = toValue(searchQuery);
      if (controller) filters.controller = toValue(controller);

      const results = await fetchSpaces(toValue(protocol), filters, pageParam);

      for (const space of results) {
        queryClient.setQueryData(
          ['spaces', 'detail', `${space.network}:${space.id}`],
          space
        );
      }

      return results;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < protocolConfig.value.limit) return null;

      return pages.length * protocolConfig.value.limit;
    },
    enabled: () => (controller ? toValue(controller) !== '' : true)
  });
}

function getCompositeSpaceId(space: Pick<Space, 'id' | 'network'>) {
  return `${space.network}:${space.id}`;
}

function uniqueOrgs(spaces: Space[]): OrganizationConfig[] {
  const seen = new Set<string>();
  const orgs: OrganizationConfig[] = [];

  for (const space of spaces) {
    const org = getOrganizationConfigBySpace(getCompositeSpaceId(space));
    if (!org || seen.has(org.id)) continue;
    seen.add(org.id);
    orgs.push(org);
  }

  return orgs;
}

/**
 * Groups every sibling space of `orgs` into as few requests as possible.
 * Onchain mainnets share one sx-api and `loadSpaces` only scopes to an indexer
 * when given a `network` filter, so their ids go in a single bucket (one
 * request covering eth/arb1/sn); each offchain hub gets its own.
 *
 * Siblings on networks this build doesn't enable are skipped: `getNetwork`
 * rejects them, and in an offchain-only build `onchainApiNetwork` falls back to
 * `eth`, which would then throw.
 *
 * Every org currently lists mainnet spaces only. If one ever lists a testnet
 * space it would need its own bucket, since testnets use a different endpoint.
 */
function siblingIdsByNetwork(orgs: OrganizationConfig[]) {
  const buckets = new Map<NetworkID, string[]>();

  for (const org of orgs) {
    for (const space of org.spaceIds) {
      if (!enabledNetworks.includes(space.network)) continue;

      const networkId = offchainNetworks.includes(space.network)
        ? space.network
        : onchainApiNetwork;

      const ids = buckets.get(networkId);
      if (ids) ids.push(space.id);
      else buckets.set(networkId, [space.id]);
    }
  }

  return buckets;
}

/**
 * Sums `active_proposals` across every space of each organization the user
 * follows, so that a sidebar org entry shows the whole org's count rather than
 * the count of the single space that got followed.
 *
 * Returns a map of org id → total (a `null` count is read as 0).
 */
export function useOrgsActiveProposalsQuery({
  followedSpaces
}: {
  followedSpaces: MaybeRefOrGetter<Space[]>;
}) {
  const orgs = computed(() => uniqueOrgs(toValue(followedSpaces)));
  const orgIds = computed(() => orgs.value.map(org => org.id).sort());

  return useQuery({
    queryKey: ['spaces', 'orgsActiveProposals', orgIds],
    queryFn: async (): Promise<Record<string, number>> => {
      // Read once: `orgs` is reactive and can change while we're in flight,
      // which would sum the new org set over the old set's results.
      const currentOrgs = orgs.value;

      const results = await Promise.all(
        [...siblingIdsByNetwork(currentOrgs)].map(([networkId, ids]) =>
          getNetwork(networkId).api.loadSpaces(
            { skip: 0, limit: 1000 },
            { id_in: ids }
          )
        )
      );

      // NOTE: unlike the other queries here we don't prime the `spaces.detail`
      // cache — these spaces are loaded only for their counts, and most of them
      // are siblings the user doesn't follow and never opens.
      const byId = new Map<string, Space>();
      for (const space of results.flat()) {
        byId.set(getCompositeSpaceId(space), space);
      }

      const counts: Record<string, number> = {};
      for (const org of currentOrgs) {
        counts[org.id] = org.spaceIds.reduce((sum, space) => {
          const loaded = byId.get(getCompositeSpaceId(space));
          return sum + (loaded?.active_proposals ?? 0);
        }, 0);
      }

      return counts;
    },
    // Following a space changes the key; without this every org badge would
    // blank out until the refetch lands.
    placeholderData: keepPreviousData,
    enabled: () => orgs.value.length > 0
  });
}
