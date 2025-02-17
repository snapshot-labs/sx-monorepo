import { defineStore } from 'pinia';
import { getNetwork, metadataNetwork, offchainNetworks } from '@/networks';
import { useFollowedSpacesQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';
import pkg from '../../package.json';

const network = getNetwork(metadataNetwork);

function getCompositeSpaceId(space: Space) {
  return `${space.network}:${space.id}`;
}

export const useFollowedSpacesStore = defineStore('followedSpaces', () => {
  const actions = useActions();
  const { web3, authInitiated } = useWeb3();
  const { isWhiteLabel } = useWhiteLabel();
  const { limits } = useSettings();

  /**
   * This Ref tracks if we have any space data already loaded. We want to show loading indicator if we have nothing,
   * but once we have some data already we ignore loading indicator, just showing old data until it's refetched.
   * This should be reset when account changes.
   * */
  const hasSpaceDataLoaded = ref(false);
  const followedSpacesIds = ref<string[]>([]);
  const followedSpacesLoaded = ref(false);
  const followedSpaceLoading = reactive(new Set<string>());
  const followedSpacesIdsByAccount = useStorage(
    `${pkg.name}.spaces-followed`,
    {} as Record<string, string[]>
  );

  const { data } = useFollowedSpacesQuery({
    followedSpacesLoaded,
    followedSpacesIds
  });

  const maxFollowLimit = computed(() => {
    return limits.value['user.default.follow_limit'];
  });

  const followedSpacesMap = computed(() => {
    if (!data.value) return new Map<string, Space>();

    return new Map(
      data.value.map(space => [getCompositeSpaceId(space), space] as const)
    );
  });

  const followedSpaces = computed({
    get() {
      return (followedSpacesIdsByAccount.value[web3.value.account] || [])
        .map(id => followedSpacesMap.value.get(id))
        .filter(space => space !== undefined);
    },
    set(spaces: Space[]) {
      followedSpacesIdsByAccount.value[web3.value.account] =
        spaces.map(getCompositeSpaceId);
    }
  });

  const followedSpaceIdsByNetwork = computed(() =>
    followedSpacesIds.value
      .map(id => id.split(':') as [NetworkID, string])
      .reduce(
        (acc, [networkId, spaceId]) => {
          acc[networkId] ||= [];
          acc[networkId].push(
            offchainNetworks.includes(networkId)
              ? spaceId
              : `${networkId}:${spaceId}`
          );
          return acc;
        },
        {} as Record<NetworkID, string[]>
      )
  );

  async function loadFollowedSpaces() {
    const followedIds = (await network.api.loadFollows(web3.value.account)).map(
      follow => getCompositeSpaceId(follow.space)
    );
    followedSpacesIds.value = followedIds;
    followedSpacesIdsByAccount.value[web3.value.account] = Array.from(
      new Set(
        [
          ...(followedSpacesIdsByAccount.value[web3.value.account] || []),
          ...followedIds
        ].filter(id => followedIds.includes(id))
      )
    );
  }

  async function toggleSpaceFollow(id: string) {
    const alreadyFollowed = followedSpacesIds.value.includes(id);
    const [spaceNetwork, spaceId] = id.split(':') as [NetworkID, string];
    followedSpaceLoading.add(id);

    try {
      if (alreadyFollowed) {
        const result = await actions.unfollowSpace(spaceNetwork, spaceId);
        if (!result) return;

        followedSpacesIds.value = followedSpacesIds.value.filter(
          (spaceId: string) => spaceId !== id
        );
        followedSpacesIdsByAccount.value[web3.value.account] =
          followedSpacesIdsByAccount.value[web3.value.account].filter(
            (spaceId: string) => spaceId !== id
          );
      } else {
        if (followedSpaces.value.length >= maxFollowLimit.value) {
          throw new Error(
            `You can follow up to ${maxFollowLimit.value} spaces.`
          );
        }

        const result = await actions.followSpace(spaceNetwork, spaceId);
        if (!result) return;

        followedSpacesIds.value.unshift(id);
        followedSpacesIdsByAccount.value[web3.value.account].unshift(id);
      }
    } finally {
      followedSpaceLoading.delete(id);
    }
  }

  function isFollowed(spaceId: string) {
    return followedSpacesIds.value.includes(spaceId);
  }

  watch(data, data => {
    if (data) hasSpaceDataLoaded.value = true;
  });

  watch(
    [
      () => web3.value.account,
      () => web3.value.authLoading,
      () => authInitiated.value,
      () => isWhiteLabel.value
    ],
    async ([web3, authLoading, authInitiated, isWhiteLabel]) => {
      if (!authInitiated || authLoading || isWhiteLabel) return;

      hasSpaceDataLoaded.value = false;
      followedSpacesLoaded.value = false;

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
    maxFollowLimit,
    followedSpaces,
    followedSpacesIds,
    followedSpaceIdsByNetwork,
    followedSpacesLoaded: computed(
      () => followedSpacesLoaded.value && hasSpaceDataLoaded.value
    ),
    followedSpaceLoading,
    toggleSpaceFollow,
    isFollowed
  };
});
