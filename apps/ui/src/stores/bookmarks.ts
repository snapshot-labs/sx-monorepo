import { defineStore } from 'pinia';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import pkg from '../../package.json';
import { NetworkID, Space } from '@/types';

const offchainNetworkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];

function compositeSpaceId(space: Space) {
  return `${space.network}:${space.id}`;
}

export const useBookmarksStore = defineStore('bookmarks', () => {
  const spacesStore = useSpacesStore();
  const actions = useActions();
  const { web3, authInitiated } = useWeb3();
  const { mixpanel } = useMixpanel();

  const spacesData = ref<Space[]>([]);
  const followedSpacesIds = ref<string[]>([]);
  const followedSpacesLoaded = ref(false);
  const followSpaceLoading = ref(false);
  const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
  const starredSpacesLoaded = ref(false);
  // Combined list of starred and followed spaces by account, to keep sort order
  const accountsBookmarkedSpacesIds = useStorage(
    `${pkg.name}.spaces-bookmarked`,
    {} as Record<string, string[]>
  );

  const bookmarksLoaded = computed(() => starredSpacesLoaded.value && followedSpacesLoaded.value);

  const bookmarkedSpacesIds = computed(
    () => accountsBookmarkedSpacesIds.value[web3.value.account] || []
  );

  const bookmarkedSpacesMap = computed(
    () => new Map(spacesData.value.map(space => [compositeSpaceId(space), space]))
  );

  const bookmarkedSpaces = computed({
    get() {
      return (web3.value.account ? bookmarkedSpacesIds.value : starredSpacesIds.value)
        .map(id => bookmarkedSpacesMap.value.get(id))
        .filter(Boolean) as Space[];
    },
    set(spaces: Space[]) {
      starredSpacesIds.value = spaces
        .filter(space => space.network !== offchainNetworkId)
        .map(compositeSpaceId);

      accountsBookmarkedSpacesIds.value[web3.value.account] = spaces.map(compositeSpaceId);
    }
  });

  function syncBookmarkedSpacesIds(spaceIds: string[], type: 'starred' | 'followed') {
    accountsBookmarkedSpacesIds.value[web3.value.account] = Array.from(
      new Set(
        [...bookmarkedSpacesIds.value, ...spaceIds].filter(
          id =>
            id.startsWith(`${offchainNetworkId}:`) !== (type === 'followed') ||
            spaceIds.includes(id)
        )
      )
    );
  }

  async function fetchSpacesData(ids: string[]) {
    if (!ids.length) return;

    await spacesStore.fetchSpaces(ids.filter(id => !spacesStore.spacesMap.has(id)));

    spacesData.value = [
      ...spacesData.value,
      ...(ids.map(id => spacesStore.spacesMap.get(id)).filter(Boolean) as Space[])
    ];
  }

  async function loadFollowedSpaces() {
    const network = getNetwork(offchainNetworkId);
    const followedIds = (await network.api.loadFollows(web3.value.account)).map(follow =>
      compositeSpaceId(follow.space)
    );
    const newIds = followedIds.filter(id => !isFollowed(id));
    followedSpacesIds.value = followedIds;

    syncBookmarkedSpacesIds(followedIds, 'followed');
    fetchSpacesData(newIds);
  }

  function toggleSpaceStar(id: string) {
    const alreadyStarred = isStarred(id);

    if (alreadyStarred) {
      starredSpacesIds.value = starredSpacesIds.value.filter((spaceId: string) => spaceId !== id);

      if (web3.value.account)
        accountsBookmarkedSpacesIds.value[web3.value.account] = accountsBookmarkedSpacesIds.value[
          web3.value.account
        ].filter((spaceId: string) => spaceId !== id);
    } else {
      starredSpacesIds.value = [id, ...starredSpacesIds.value];

      if (web3.value.account)
        accountsBookmarkedSpacesIds.value[web3.value.account] = [id, ...bookmarkedSpacesIds.value];
    }

    mixpanel.track('Set space favorite', {
      space: id,
      favorite: !alreadyStarred
    });
  }

  async function toggleSpaceFollow(id: string) {
    const alreadyFollowed = followedSpacesIds.value.includes(id);
    const [spaceNetwork, spaceId] = id.split(':');
    followSpaceLoading.value = true;

    try {
      if (alreadyFollowed) {
        const result = await actions.unfollowSpace(spaceNetwork as NetworkID, spaceId);
        if (!result) return;

        followedSpacesIds.value = followedSpacesIds.value.filter(
          (spaceId: string) => spaceId !== id
        );
        accountsBookmarkedSpacesIds.value[web3.value.account] = accountsBookmarkedSpacesIds.value[
          web3.value.account
        ].filter((spaceId: string) => spaceId !== id);
      } else {
        const result = await actions.followSpace(spaceNetwork as NetworkID, spaceId);
        if (!result) return;

        fetchSpacesData([id]);

        followedSpacesIds.value = [id, ...followedSpacesIds.value];
        accountsBookmarkedSpacesIds.value[web3.value.account] = [id, ...bookmarkedSpacesIds.value];
      }
    } catch (e) {
    } finally {
      followSpaceLoading.value = false;
    }
  }

  function isStarred(spaceId: string) {
    return starredSpacesIds.value.includes(spaceId);
  }

  function isFollowed(spaceId: string) {
    return followedSpacesIds.value.includes(spaceId);
  }

  watch(
    starredSpacesIds,
    async (currentIds, previousIds) => {
      if (web3.value.account) syncBookmarkedSpacesIds(currentIds, 'starred');

      const newIds = !previousIds
        ? currentIds
        : currentIds.filter(
            (id: string) => !previousIds.includes(id) && !bookmarkedSpacesMap.value.has(id)
          );

      await fetchSpacesData(newIds);

      starredSpacesLoaded.value = true;
    },
    { immediate: true }
  );

  watch(
    [
      () => web3.value.account,
      () => web3.value.type,
      () => web3.value.authLoading,
      () => authInitiated.value
    ],
    async ([web3, type, authLoading, authInitiated]) => {
      if (!authInitiated || authLoading) return;

      if (!web3) {
        followedSpacesIds.value = [];
        followedSpacesLoaded.value = true;
        return;
      }

      if (type !== 'argentx') await loadFollowedSpaces();

      followedSpacesLoaded.value = true;
    },
    { immediate: true }
  );

  return {
    bookmarkedSpaces,
    bookmarksLoaded,
    starredSpacesLoaded,
    followedSpacesIds,
    followedSpacesLoaded,
    followSpaceLoading,
    isStarred,
    isFollowed,
    toggleSpaceStar,
    toggleSpaceFollow
  };
});
