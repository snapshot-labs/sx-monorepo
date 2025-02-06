import { useInfiniteQuery } from '@tanstack/vue-query';
import { SPACE_CATEGORIES } from '@/helpers/constants';
import { explorePageProtocols, getNetwork, offchainNetworks } from '@/networks';
import { ExplorePageProtocol, SpacesFilter } from '@/networks/types';
import { NetworkID } from '@/types';

type SpaceCategory = 'all' | (typeof SPACE_CATEGORIES)[number]['id'];

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

export function useExploreSpacesQuery({
  protocol,
  network,
  category,
  searchQuery
}: {
  protocol: Ref<ExplorePageProtocol>;
  network: Ref<string>;
  category: Ref<SpaceCategory>;
  searchQuery: Ref<string | undefined>;
}) {
  const protocolConfig = computed(() => explorePageProtocols[protocol.value]);

  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: [
      'explore',
      {
        protocol,
        network,
        category,
        searchQuery
      }
    ],
    queryFn: ({ pageParam }) =>
      fetchSpaces(
        protocol.value,
        {
          network: network.value,
          category: category.value,
          searchQuery: searchQuery.value
        },
        pageParam
      ),
    getNextPageParam: (lastPage, pages) => {
      if (protocol.value === 'snapshotx') {
        // SnapshotX has disabled pagination until unified API is implemented.
        // Right now we fetch 1000 spaces per network.
        return null;
      }

      if (lastPage.length < protocolConfig.value.limit) return null;

      return pages.length * protocolConfig.value.limit;
    }
  });
}
