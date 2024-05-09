import { defineStore } from 'pinia';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import pkg from '../../package.json';
import { NetworkID, Space } from '@/types';

const offchainNetworkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const network = getNetwork(offchainNetworkId);

function getCompositeSpaceId(space: Space) {
  return `${space.network}:${space.id}`;
}

export const useFollowedSpacesStore = defineStore('followedSpaces', () => {
  const spacesStore = useSpacesStore();
  const actions = useActions();
  const { web3, authInitiated } = useWeb3();

  const followedSpacesIds = ref<string[]>([]);
  const followedSpacesLoaded = ref(false);
  const followedSpaceLoading = ref(false);
  const followedSpacesIdsByAccount = useStorage(
    `${pkg.name}.spaces-followed`,
    {} as Record<string, string[]>
  );

  const followedSpacesMap = computed(
    () =>
      new Map(
        followedSpacesIds.value
          .map(spaceId => {
            const space = spacesStore.spacesMap.get(spaceId);
            if (!space) return;

            return [getCompositeSpaceId(space), space];
          })
          .filter(Boolean) as [string, Space][]
      )
  );

  const followedSpaces = computed({
    get() {
      return (followedSpacesIdsByAccount.value[web3.value.account] || [])
        .map(id => followedSpacesMap.value.get(id))
        .filter(Boolean) as Space[];
    },
    set(spaces: Space[]) {
      followedSpacesIdsByAccount.value[web3.value.account] = spaces.map(getCompositeSpaceId);
    }
  });

  async function fetchSpacesData(ids: string[]) {
    if (!ids.length) return;

    await spacesStore.fetchSpaces(ids.filter(id => !spacesStore.spacesMap.has(id)));
  }

  async function loadFollowedSpaces() {
    const followedIds = (await network.api.loadFollows(web3.value.account)).map(follow =>
      getCompositeSpaceId(follow.space)
    );
    const newIds = followedIds.filter(id => !isFollowed(id));
    followedSpacesIds.value = followedIds;
    followedSpacesIdsByAccount.value[web3.value.account] = Array.from(
      new Set(
        [...(followedSpacesIdsByAccount.value[web3.value.account] || []), ...followedIds].filter(
          id => followedIds.includes(id)
        )
      )
    );
    fetchSpacesData(newIds);
  }

  async function toggleSpaceFollow(id: string) {
    const alreadyFollowed = followedSpacesIds.value.includes(id);
    const [spaceNetwork, spaceId] = id.split(':') as [NetworkID, string];
    followedSpaceLoading.value = true;

    try {
      if (alreadyFollowed) {
        const result = await actions.unfollowSpace(spaceNetwork, spaceId);
        if (!result) return;

        followedSpacesIds.value = followedSpacesIds.value.filter(
          (spaceId: string) => spaceId !== id
        );
        followedSpacesIdsByAccount.value[web3.value.account] = followedSpacesIdsByAccount.value[
          web3.value.account
        ].filter((spaceId: string) => spaceId !== id);
      } else {
        const result = await actions.followSpace(spaceNetwork, spaceId);
        if (!result) return;

        fetchSpacesData([id]);

        followedSpacesIds.value.unshift(id);
        followedSpacesIdsByAccount.value[web3.value.account].unshift(id);
      }
    } catch (e) {
    } finally {
      followedSpaceLoading.value = false;
    }
  }

  function isFollowed(spaceId: string) {
    return followedSpacesIds.value.includes(spaceId);
  }

  watch(
    [() => web3.value.account, () => web3.value.authLoading, () => authInitiated.value],
    async ([web3, authLoading, authInitiated]) => {
      if (!authInitiated || authLoading) return;

      if (!web3) {
        followedSpacesIds.value = [];
        followedSpacesLoaded.value = true;
        return;
      }

      await loadFollowedSpaces();

      followedSpacesLoaded.value = true;
    },
    { immediate: true }
  );

  return {
    followedSpaces,
    followedSpacesIds,
    followedSpacesLoaded,
    followedSpaceLoading,
    toggleSpaceFollow,
    isFollowed
  };
});
