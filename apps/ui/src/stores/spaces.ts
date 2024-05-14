import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

export const useSpacesStore = defineStore('spaces', () => {
  const metaStore = useMetaStore();

  const {
    loading,
    loadingMore,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
    protocol,
    fetch,
    fetchMore,
    getSpaces
  } = useSpaces();

  async function fetchSpace(spaceId: string, networkId: NetworkID) {
    await metaStore.fetchBlock(networkId);

    const network = getNetwork(networkId);

    const space = await network.api.loadSpace(spaceId);
    if (!space) return;

    networksMap.value[networkId].spaces = {
      ...networksMap.value[networkId].spaces,
      [spaceId]: space
    };
  }

  async function fetchSpaces(spaceIds: string[]) {
    const spaces = await getSpaces({
      id_in: spaceIds
    });

    if (!spaces.length) return;

    for (const space of spaces) {
      networksMap.value[space.network].spaces = {
        ...networksMap.value[space.network].spaces,
        [space.id]: space
      };
    }
  }

  return {
    loading,
    loadingMore,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
    protocol,
    fetch,
    fetchMore,
    fetchSpace,
    fetchSpaces
  };
});
