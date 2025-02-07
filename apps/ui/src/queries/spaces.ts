import {
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { SPACE_CATEGORIES } from '@/helpers/constants';
import {
  enabledNetworks,
  explorePageProtocols,
  getNetwork,
  offchainNetworks
} from '@/networks';
import { ExplorePageProtocol, SpacesFilter } from '@/networks/types';
import { NetworkID } from '@/types';

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
  let { networks } = explorePageProtocols[protocol];

  if (protocol === 'snapshotx' && filter?.network && filter.network !== 'all') {
    networks = [filter.network as NetworkID];
  }

  const results = await Promise.all(
    networks.map(async id => {
      const network = getNetwork(id);

      return network.api.loadSpaces(
        {
          skip,
          limit
        },
        filter
      );
    })
  );

  const allResults = results.flat();

  if (offchainNetworks.includes(networks[0])) {
    return allResults;
  }

  // this only works, because we fetch 1000 spaces per network
  // to have proper handling of this we would need unified API
  return allResults.sort((a, b) => {
    return (
      Number(b.turbo) - Number(a.turbo) ||
      Number(b.verified) - Number(a.verified) ||
      b.vote_count - a.vote_count
    );
  });
}

export function useSpaceQuery({
  networkId,
  spaceId
}: {
  networkId: Ref<NetworkID | null>;
  spaceId: Ref<string | null>;
}) {
  const metaStore = useMetaStore();

  return useQuery({
    queryKey: ['spaces', 'detail', () => `${networkId.value}:${spaceId.value}`],
    queryFn: async () => {
      if (!networkId.value || !spaceId.value) return null;

      await metaStore.fetchBlock(networkId.value);
      const network = getNetwork(networkId.value);

      return network.api.loadSpace(spaceId.value);
    },
    enabled: () => networkId.value !== null && spaceId.value !== null
  });
}

export function useExploreSpacesQuery({
  protocol,
  network,
  category,
  controller,
  searchQuery
}: {
  protocol: Ref<ExplorePageProtocol>;
  network?: Ref<string>;
  category?: Ref<SpaceCategory>;
  controller?: Ref<string>;
  searchQuery?: Ref<string | undefined>;
}) {
  const queryClient = useQueryClient();
  const protocolConfig = computed(() => explorePageProtocols[protocol.value]);

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
      if (network) filters.network = network.value;
      if (category) filters.category = category.value;
      if (searchQuery) filters.searchQuery = searchQuery.value;
      if (controller) filters.controller = controller.value;

      const results = await fetchSpaces(protocol.value, filters, pageParam);

      for (const space of results) {
        queryClient.setQueryData(
          ['spaces', 'detail', `${space.network}:${space.id}`],
          space
        );
      }

      return results;
    },
    getNextPageParam: (lastPage, pages) => {
      if (protocol.value === 'snapshotx') {
        // SnapshotX has disabled pagination until unified API is implemented.
        // Right now we fetch 1000 spaces per network.
        return null;
      }

      if (lastPage.length < protocolConfig.value.limit) return null;

      return pages.length * protocolConfig.value.limit;
    },
    enabled: () => (controller ? controller.value !== '' : true)
  });
}
