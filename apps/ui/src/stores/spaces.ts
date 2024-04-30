import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

export const useSpacesStore = defineStore('spaces', () => {
  const metaStore = useMetaStore();

  const { loading, loaded, networksMap, spaces, spacesMap, hasMoreSpaces, fetch, fetchMore } =
    useSpaces();

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

  async function fetchSpaces(spaceIds: string[], networkId: NetworkID) {
    await metaStore.fetchBlock(networkId);

    const network = getNetwork(networkId);

    const spaces = await network.api.loadSpaces(
      {
        skip: 0,
        limit: 100
      },
      {
        id_in: spaceIds
      }
    );

    if (!spaces.length) return;

    networksMap.value[networkId].spaces = {
      ...networksMap.value[networkId].spaces,
      ...Object.fromEntries(spaces.map(space => [space.id, space]))
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
    fetchSpaces
  };
});
