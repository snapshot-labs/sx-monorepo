import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { getNetwork } from '@/networks';
import { NetworkID, Space } from '@/types';
import { useSpaces } from '@/composables/useSpaces';
import pkg from '../../package.json';

export const useSpacesStore = defineStore('spaces', () => {
  const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
  const starredSpacesData = ref([] as Space[]);

  const {
    loading,
    loaded,
    networksMap,
    spaces,
    spacesMap,
    hasMoreSpaces,
    getSpaces,
    fetch,
    fetchMore
  } = useSpaces();

  const starredSpacesMap = computed(
    () => new Map(starredSpacesData.value.map(space => [`${space.network}:${space.id}`, space]))
  );

  const starredSpaces = computed({
    get() {
      return starredSpacesIds.value
        .map(id => starredSpacesMap.value.get(id))
        .filter(Boolean) as Space[];
    },
    set(spaces: Space[]) {
      starredSpacesIds.value = spaces.map(space => `${space.network}:${space.id}`);
    }
  });

  async function fetchSpace(spaceId: string, networkId: NetworkID) {
    const network = getNetwork(networkId);

    const space = await network.api.loadSpace(spaceId);
    if (!space) return;

    networksMap.value[networkId].spaces = {
      ...networksMap.value[networkId].spaces,
      [spaceId]: space
    };
  }

  function toggleSpaceStar(id: string) {
    if (starredSpacesIds.value.includes(id)) {
      starredSpacesIds.value = starredSpacesIds.value.filter((spaceId: string) => spaceId !== id);
    } else {
      starredSpacesIds.value = [id, ...starredSpacesIds.value];
    }
  }

  watch(
    starredSpacesIds,
    async (currentIds, previousIds) => {
      const newIds = !previousIds
        ? currentIds
        : currentIds.filter((id: string) => !previousIds.includes(id));

      const spaces = await getSpaces({
        id_in: newIds
      });

      starredSpacesData.value = [...starredSpacesData.value, ...spaces];
    },
    { immediate: true }
  );

  return {
    starredSpacesIds,
    starredSpaces,
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
