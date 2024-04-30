import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

export const useSpacesStore = defineStore('spaces', () => {
  const metaStore = useMetaStore();

  const {
    loading,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
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

  return {
    loading,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
    fetch,
    fetchMore,
    fetchSpace,
    getSpaces
  };
});
