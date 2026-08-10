import {
  keepPreviousData,
  skipToken,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { SPACE_CATEGORIES } from '@/helpers/constants';
import { enabledNetworks, explorePageProtocols, getNetwork } from '@/networks';
import { ExplorePageProtocol, SpacesFilter } from '@/networks/types';
import { NetworkID, Space } from '@/types';

type SpaceCategory = 'all' | (typeof SPACE_CATEGORIES)[number]['id'];

export const SPACES_KEYS = {
  all: ['spaces'] as const,
  detail: (spaceId: MaybeRefOrGetter<string>) =>
    [...SPACES_KEYS.all, 'detail', spaceId] as const
};

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
          const existingData = queryClient.getQueryData<Space>(
            SPACES_KEYS.detail(id)
          );

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
          SPACES_KEYS.detail(`${space.network}:${space.id}`),
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

export function spaceQueryFn(networkId: NetworkID, spaceId: string) {
  return async (): Promise<Space | null> => {
    const metaStore = useMetaStore();

    await metaStore.fetchBlock(networkId);

    return getNetwork(networkId).api.loadSpace(spaceId);
  };
}

export function useSpaceQuery({
  networkId,
  spaceId
}: {
  networkId: MaybeRefOrGetter<NetworkID | null>;
  spaceId: MaybeRefOrGetter<string | null>;
}) {
  return useQuery({
    queryKey: SPACES_KEYS.detail(
      () => `${toValue(networkId)}:${toValue(spaceId)}`
    ),
    queryFn: async () => {
      const networkIdValue = toValue(networkId);
      const spaceIdValue = toValue(spaceId);

      if (!networkIdValue || !spaceIdValue) return null;

      return spaceQueryFn(networkIdValue, spaceIdValue)();
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
          SPACES_KEYS.detail(`${space.network}:${space.id}`),
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
