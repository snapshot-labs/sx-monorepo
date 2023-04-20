import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';
import { useSpaces } from '@/composables/useSpaces';
import pkg from '../../package.json';

export const useSpacesStore = defineStore('spaces', () => {
  const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);

  const { loading, loaded, networksMap, spaces, spacesMap, hasMoreSpaces, fetch, fetchMore } =
    useSpaces();

  async function fetchSpace(spaceId: string, networkId: NetworkID) {
    const network = getNetwork(networkId);

    const space = await network.api.loadSpace(spaceId);

    networksMap.value[networkId].spaces = {
      ...networksMap.value[networkId].spaces,
      [spaceId]: space
    };
  }

  function toggleSpaceStar(id: string) {
    if (starredSpacesIds.value.includes(id)) {
      starredSpacesIds.value = starredSpacesIds.value.filter((spaceId: string) => spaceId !== id);
    } else {
      starredSpacesIds.value.unshift(id);
    }
  }

  return {
    starredSpacesIds,
    loading,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
    fetch,
    fetchMore,
    fetchSpace,
    toggleSpaceStar
  };
});
