import { useQuery, useQueryClient } from '@tanstack/vue-query';
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
  const queryClient = useQueryClient();
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
  const followedSpaceLoading = reactive(new Set<string>());
  const followedSpacesIdsByAccount = useStorage(
    `${pkg.name}.spaces-followed`,
    {} as Record<string, string[]>
  );

  const { data: followedSpacesIds } = useQuery({
    queryKey: ['followedSpaces', () => web3.value.account],
    queryFn: async () => {
      const follows = await network.api.loadFollows(web3.value.account);

      return follows.map(follow => getCompositeSpaceId(follow.space));
    },
    enabled: () =>
      authInitiated.value && !isWhiteLabel.value && !!web3.value.account
  });

  const { data: followedSpacesData } = useFollowedSpacesQuery({
    followedSpacesIds
  });

  const maxFollowLimit = computed(() => {
    return limits.value['user.default.follow_limit'];
  });

  const followedSpacesMap = computed(() => {
    if (!followedSpacesData.value) return new Map<string, Space>();

    return new Map(
      followedSpacesData.value.map(
        space => [getCompositeSpaceId(space), space] as const
      )
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
    (followedSpacesIds.value ?? [])
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

  async function toggleSpaceFollow(id: string) {
    if (!followedSpacesIds.value) return;

    const alreadyFollowed = followedSpacesIds.value.includes(id);
    const [spaceNetwork, spaceId] = id.split(':') as [NetworkID, string];
    followedSpaceLoading.add(id);

    try {
      if (alreadyFollowed) {
        const result = await actions.unfollowSpace(spaceNetwork, spaceId);
        if (!result) return;

        queryClient.setQueryData<string[]>(
          ['followedSpaces', web3.value.account],
          old => (old ?? []).filter(spaceId => spaceId !== id)
        );
      } else {
        if (followedSpaces.value.length >= maxFollowLimit.value) {
          throw new Error(
            `You can follow up to ${maxFollowLimit.value} spaces.`
          );
        }

        const result = await actions.followSpace(spaceNetwork, spaceId);
        if (!result) return;

        // NOTE: here we put it in followedSpacesIdsByAccount as well so it ends up at the top of the list
        followedSpacesIdsByAccount.value[web3.value.account].unshift(id);
        queryClient.setQueryData<string[]>(
          ['followedSpaces', web3.value.account],
          old => [id, ...(old ?? [])]
        );
      }
    } finally {
      followedSpaceLoading.delete(id);
    }
  }

  function isFollowed(spaceId: string) {
    return followedSpacesIds.value?.includes(spaceId);
  }

  watch(
    followedSpacesIds,
    followedSpacesIds => {
      if (!followedSpacesIds) return;

      followedSpacesIdsByAccount.value[web3.value.account] = Array.from(
        new Set(
          [
            ...(followedSpacesIdsByAccount.value[web3.value.account] || []),
            ...followedSpacesIds
          ].filter(id => followedSpacesIds.includes(id))
        )
      );
    },
    {
      immediate: true
    }
  );

  watch(followedSpacesData, data => {
    if (data) hasSpaceDataLoaded.value = true;
  });

  watch(
    () => web3.value.account,
    () => {
      hasSpaceDataLoaded.value = false;
    }
  );

  return {
    maxFollowLimit,
    followedSpaces,
    followedSpacesIds: computed(() => followedSpacesIds.value ?? []),
    followedSpaceIdsByNetwork,
    followedSpacesLoaded: computed(
      () =>
        (!web3.value.authLoading && !web3.value.account) ||
        hasSpaceDataLoaded.value
    ),
    followedSpaceLoading,
    toggleSpaceFollow,
    isFollowed
  };
});
