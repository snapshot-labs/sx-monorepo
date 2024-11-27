import { computed, ref } from 'vue';
import {
  DEFAULT_SPACES_LIMIT,
  enabledNetworks,
  explorePageProtocols,
  getNetwork,
  offchainNetworks
} from '@/networks';
import { ExplorePageProtocol, SpacesFilter } from '@/networks/types';
import { NetworkID, Space } from '@/types';

type NetworkRecord = {
  spaces: Record<string, Space>;
  spacesIdsList: string[];
  hasMoreSpaces: boolean;
};

export function useSpaces() {
  const loading = ref(false);
  const loadingMore = ref(false);
  const loaded = ref(false);
  const protocol = ref('snapshot' as ExplorePageProtocol);

  const networksMap = ref(
    Object.fromEntries(
      enabledNetworks.map(network => [
        network,
        {
          spaces: {},
          spacesIdsList: [],
          hasMoreSpaces: true
        } as NetworkRecord
      ])
    )
  );

  const explorePageSpaces = ref<Space[]>([]);

  const spaces = computed(() => {
    const protocolNetworks = explorePageProtocols[protocol.value].networks;
    return Object.values(networksMap.value).flatMap(record => {
      const spacesFromRecord = record.spacesIdsList.map(
        spaceId => record.spaces[spaceId]
      );
      return spacesFromRecord.filter(space =>
        protocolNetworks.includes(space.network)
      );
    });
  });

  const spacesMap = computed(
    () =>
      new Map(
        Object.values(networksMap.value).flatMap(record =>
          Object.values(record.spaces).map(space => [
            `${space.network}:${space.id}`,
            space
          ])
        )
      )
  );

  const hasMoreSpaces = computed(() =>
    Object.values(networksMap.value).some(
      record => record.hasMoreSpaces === true
    )
  );

  async function getSpaces(filter?: SpacesFilter) {
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
            limit: DEFAULT_SPACES_LIMIT
          },
          requestFilter
        );
      })
    );

    return results.flat();
  }

  async function _fetchSpaces(overwrite: boolean, filter?: SpacesFilter) {
    const { limit } = explorePageProtocols[protocol.value];
    let { networks } = explorePageProtocols[protocol.value];
    let unsortedExplorePageSpaces = overwrite ? [] : explorePageSpaces.value;

    if (
      protocol.value === 'snapshotx' &&
      filter?.network &&
      filter.network !== 'all'
    ) {
      networks = [filter.network as NetworkID];
    }

    const results = await Promise.all(
      networks.map(async id => {
        const network = getNetwork(id);

        const record = networksMap.value[id];
        if (!overwrite && !record.hasMoreSpaces) {
          return {
            id,
            spaces: [],
            hasMoreSpaces: false
          };
        }

        const spaces = await network.api.loadSpaces(
          {
            skip: overwrite ? 0 : record.spacesIdsList.length,
            limit
          },
          filter
        );

        unsortedExplorePageSpaces = [...unsortedExplorePageSpaces, ...spaces];

        return {
          id,
          spaces,
          hasMoreSpaces: spaces.length === limit
        };
      })
    );

    // this only works, because we fetch 1000 spaces per network
    // to have proper handling of this we would need unified API
    explorePageSpaces.value = offchainNetworks.includes(networks[0])
      ? unsortedExplorePageSpaces
      : unsortedExplorePageSpaces.sort((a, b) => {
          return (
            Number(b.turbo) - Number(a.turbo) ||
            Number(b.verified) - Number(a.verified) ||
            b.vote_count - a.vote_count
          );
        });

    networksMap.value = {
      ...networksMap.value,
      ...(Object.fromEntries(
        results.map(result => {
          const spacesIds = result.spaces.map(space => space.id);

          return [
            result.id,
            {
              spacesIdsList: overwrite
                ? spacesIds
                : [...networksMap.value[result.id].spacesIdsList, ...spacesIds],
              spaces: {
                ...networksMap.value[result.id].spaces,
                ...Object.fromEntries(
                  result.spaces.map(space => [space.id, space])
                )
              },
              hasMoreSpaces: result.hasMoreSpaces
            }
          ];
        })
      ) as Record<NetworkID, NetworkRecord>)
    };
  }

  async function fetch(filter?: SpacesFilter) {
    if (loading.value) return;
    loading.value = true;

    await _fetchSpaces(true, filter);

    loaded.value = true;
    loading.value = false;
  }

  async function fetchMore(filter?: SpacesFilter) {
    if (loading.value || !loaded.value || loadingMore.value) return;
    loadingMore.value = true;

    await _fetchSpaces(false, filter);

    loadingMore.value = false;
  }

  return {
    loading,
    loadingMore,
    loaded,
    networksMap,
    explorePageSpaces,
    spaces,
    spacesMap,
    hasMoreSpaces,
    protocol,
    getSpaces,
    fetch,
    fetchMore
  };
}
