import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import type { NetworkID, Proposal, Space, Vote } from '@/types';
import pkg from '../../package.json';

const votes = ref<Record<Proposal['id'], Vote>>({});
const spacesData = ref<Space[]>([]);
const followedSpacesIds = ref<string[]>([]);
const followedSpacesLoaded = ref(false);
const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
const starredSpacesLoaded = ref(false);
// Combined list of starred and followed spaces by account, to keep sort order
const accountsBookmarkedSpacesIds = useStorage(
  `${pkg.name}.spaces-bookmarked`,
  {} as Record<string, string[]>
);

export function useAccount() {
  const { web3, authInitiated } = useWeb3();
  const { spacesMap, getSpaces } = useSpaces();
  const { mixpanel } = useMixpanel();

  const offchainNetworkId = offchainNetworks.filter(network =>
    enabledNetworks.includes(network)
  )[0];

  const bookmarksLoaded = computed(() => starredSpacesLoaded.value && followedSpacesLoaded.value);

  const bookmarkedSpacesIds = computed(
    () => accountsBookmarkedSpacesIds.value[web3.value.account] || []
  );

  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account);

    votes.value = { ...votes.value, ...userVotes };
  }

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

    const spaces = await getSpaces({
      id_in: ids.filter(id => !spacesMap.value.has(id))
    });

    spacesData.value = [
      ...spacesData.value,
      ...spaces,
      ...(ids.map(id => spacesMap.value.get(id)).filter(Boolean) as Space[])
    ];
  }

  async function loadFollowedSpaces() {
    const network = getNetwork(offchainNetworkId);
    const followedIds = (await network.api.loadFollows(web3.value.account)).map(
      follow => `${offchainNetworkId}:${follow.space.id}`
    );
    const newIds = followedIds.filter(id => !followedSpacesIds.value.includes(id));
    followedSpacesIds.value = followedIds;

    syncBookmarkedSpacesIds(followedIds, 'followed');
    fetchSpacesData(newIds);
  }

  function toggleSpaceStar(id: string) {
    const alreadyStarred = starredSpacesIds.value.includes(id);

    if (alreadyStarred) {
      starredSpacesIds.value = starredSpacesIds.value.filter((spaceId: string) => spaceId !== id);
      accountsBookmarkedSpacesIds.value[web3.value.account] = accountsBookmarkedSpacesIds.value[
        web3.value.account
      ].filter((spaceId: string) => spaceId !== id);
    } else {
      starredSpacesIds.value = [id, ...starredSpacesIds.value];
      accountsBookmarkedSpacesIds.value[web3.value.account] = [id, ...bookmarkedSpacesIds.value];
    }

    mixpanel.track('Set space favorite', {
      space: id,
      favorite: !alreadyStarred
    });
  }

  const bookmarkedSpacesMap = computed(
    () => new Map(spacesData.value.map(space => [`${space.network}:${space.id}`, space]))
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
        .map(space => `${space.network}:${space.id}`);

      accountsBookmarkedSpacesIds.value[web3.value.account] = spaces.map(
        space => `${space.network}:${space.id}`
      );
    }
  });

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
    [() => web3.value.account, () => web3.value.type, () => authInitiated.value],
    async ([web3, type, authInitiated]) => {
      if (!authInitiated) return;

      if (!web3) {
        votes.value = {};
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
    account: web3.value.account,
    bookmarkedSpaces,
    bookmarksLoaded,
    starredSpacesIds,
    starredSpacesLoaded,
    followedSpacesIds,
    followedSpacesLoaded,
    votes,
    loadVotes,
    toggleSpaceStar
  };
}
