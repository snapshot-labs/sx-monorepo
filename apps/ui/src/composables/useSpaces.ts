import { ref, computed } from 'vue';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Space, NetworkID } from '@/types';
import { SpacesFilter } from '@/networks/types';

const SPACES_LIMIT = {
  snapshot: 18,
  default: 1000
};

type NetworkRecord = {
  spaces: Record<string, Space>;
  spacesIdsList: string[];
  hasMoreSpaces: boolean;
};

export function useSpaces() {
  const loading = ref(false);
  const loadingMore = ref(false);
  const loaded = ref(false);
  const networkType = ref('snapshot');
  const exploreNetworks = computed(() =>
    networkType.value === 'snapshot'
      ? ['s']
      : enabledNetworks.filter(network => !offchainNetworks.includes(network))
  );
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

  const spaces = computed(() =>
    Object.values(networksMap.value).flatMap(record =>
      record.spacesIdsList
        .map(spaceId => record.spaces[spaceId])
        .filter(space => exploreNetworks.value.includes(space.network))
    )
  );

  const spacesMap = computed(
    () =>
      new Map(
        Object.values(networksMap.value).flatMap(record =>
          Object.values(record.spaces).map(space => [`${space.network}:${space.id}`, space])
        )
      )
  );

  const hasMoreSpaces = computed(() =>
    Object.values(networksMap.value).some(record => record.hasMoreSpaces === true)
  );

  async function getSpaces(filter?: SpacesFilter) {
    const results = await Promise.all(
      enabledNetworks.map(async id => {
        const network = getNetwork(id);

        const requestFilter = {
          ...filter
        };

        if (requestFilter?.id_in) {
          const filtered = requestFilter.id_in.filter(spaceId => spaceId.startsWith(`${id}:`));
          if (filtered.length === 0) return [];

          requestFilter.id_in = filtered.map(spaceId => spaceId.split(':')[1]);
        }

        return network.api.loadSpaces(
          {
            skip: 0,
            limit: SPACES_LIMIT.default
          },
          requestFilter
        );
      })
    );

    return results.flat();
  }

  async function _fetchSpaces(overwrite: boolean, filter?: SpacesFilter) {
    let spacesLimit = SPACES_LIMIT.default;
    if (networkType.value === 'snapshot') {
      spacesLimit = SPACES_LIMIT.snapshot;
    }

    const results = await Promise.all(
      exploreNetworks.value.map(async id => {
        const network = getNetwork(id as NetworkID);

        const record = networksMap.value[id];
        if (!record.hasMoreSpaces) {
          return {
            id,
            spaces: [],
            hasMoreSpaces: false
          };
        }

        const spaces = await network.api.loadSpaces(
          {
            skip: overwrite ? 0 : record.spacesIdsList.length,
            limit: spacesLimit
          },
          filter
        );

        return {
          id,
          spaces,
          hasMoreSpaces: spaces.length === spacesLimit
        };
      })
    );

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
                ...Object.fromEntries(result.spaces.map(space => [space.id, space]))
              },
              hasMoreSpaces: result.hasMoreSpaces
            }
          ];
        })
      ) as Record<NetworkID, NetworkRecord>)
    };
    console.log('networksMap.value', networksMap.value);
  }

  async function fetch(filter?: SpacesFilter) {
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

  async function handleNetworkTypeChange(type: string) {
    networkType.value = type;
    await fetch();
  }

  return {
    loading,
    loadingMore,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
    getSpaces,
    fetch,
    fetchMore,
    handleNetworkTypeChange
  };
}
