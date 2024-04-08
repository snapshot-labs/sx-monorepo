import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { NetworkID, Space } from '@/types';
import pkg from '../../package.json';

export const useSpacesStore = defineStore('spaces', () => {
  const metaStore = useMetaStore();
  const { mixpanel } = useMixpanel();
  const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
  const starredSpacesData = ref([] as Space[]);
  const starredSpacesLoaded = ref(false);

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
    await metaStore.fetchBlock(networkId);

    const network = getNetwork(networkId);

    const space = await network.api.loadSpace(spaceId);
    if (!space) return;

    networksMap.value[networkId].spaces = {
      ...networksMap.value[networkId].spaces,
      [spaceId]: space
    };
  }

  function toggleSpaceStar(id: string) {
    const alreadyStarred = starredSpacesIds.value.includes(id);

    if (alreadyStarred) {
      starredSpacesIds.value = starredSpacesIds.value.filter((spaceId: string) => spaceId !== id);
    } else {
      starredSpacesIds.value = [id, ...starredSpacesIds.value];
    }

    mixpanel.track('Set space favorite', {
      space: id,
      favorite: !alreadyStarred
    });
  }

  watch(
    starredSpacesIds,
    async (currentIds, previousIds) => {
      const newIds = !previousIds
        ? currentIds
        : currentIds.filter(
            (id: string) => !previousIds.includes(id) && !starredSpacesMap.value.has(id)
          );

      if (!newIds.length) {
        starredSpacesLoaded.value = true;
        return;
      }

      const spaces = await getSpaces({
        id_in: newIds.filter(id => !spacesMap.value.has(id))
      });

      starredSpacesLoaded.value = true;
      starredSpacesData.value = [
        ...starredSpacesData.value,
        ...spaces,
        ...(newIds.map(id => spacesMap.value.get(id)).filter(s => !!s) as Space[])
      ];
    },
    { immediate: true }
  );

  return {
    starredSpacesIds,
    starredSpaces,
    starredSpacesLoaded,
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
