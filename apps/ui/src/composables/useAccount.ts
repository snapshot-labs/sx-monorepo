import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import type { NetworkID, Proposal, Space, Vote } from '@/types';
import pkg from '../../package.json';

const votes = ref<Record<Proposal['id'], Vote>>({});
const spacesData = ref<Space[]>([]);
const followedSpacesIds = ref<Space['id'][]>([]);
const followedSpacesLoaded = ref(false);
const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
const starredSpacesLoaded = ref(false);
// Combined list of starred and followed spaces by account, to keep sort order
const accountBookmarkedSpacesIds = useStorage(
  `${pkg.name}.spaces-bookmarked`,
  {} as Record<string, string[]>
);

export function useAccount() {
  const { web3, authInitiated } = useWeb3();
  const { mixpanel } = useMixpanel();
  const { spacesMap, getSpaces } = useSpaces();

  const offchainNetworkId = computed(
    () => offchainNetworks.filter(network => enabledNetworks.includes(network))[0]
  );

  async function loadVotes(networkId: NetworkID, spaceId?: string) {
    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceId, account);

    votes.value = { ...votes.value, ...userVotes };
  }

  async function loadFollowedSpaces() {
    const network = getNetwork(offchainNetworkId.value);
    const followedIds = (await network.api.loadFollows(web3.value.account)).map(
      follow => `${offchainNetworkId.value}:${follow.space.id}`
    );
    const newIds = followedIds.filter(id => !followedSpacesIds.value.includes(id));

    accountBookmarkedSpacesIds.value[web3.value.account] = Array.from(
      new Set(
        [...(accountBookmarkedSpacesIds.value[web3.value.account] || []), ...followedIds].filter(
          id => !id.startsWith(`${offchainNetworkId.value}:`) || followedIds.includes(id)
        )
      )
    );

    if (!newIds.length) return;

    const spaces = await getSpaces({
      id_in: newIds.filter(id => !spacesMap.value.has(id))
    });

    followedSpacesIds.value = followedIds;

    spacesData.value = [
      ...spacesData.value,
      ...spaces,
      ...(newIds.map(id => spacesMap.value.get(id)).filter(s => !!s) as Space[])
    ];
  }

  function toggleSpaceStar(id: string) {
    const alreadyStarred = starredSpacesIds.value.includes(id);

    if (alreadyStarred) {
      starredSpacesIds.value = starredSpacesIds.value.filter((spaceId: string) => spaceId !== id);
      accountBookmarkedSpacesIds.value[web3.value.account] = accountBookmarkedSpacesIds.value[
        web3.value.account
      ].filter((spaceId: string) => spaceId !== id);
    } else {
      starredSpacesIds.value = [id, ...starredSpacesIds.value];
      accountBookmarkedSpacesIds.value[web3.value.account] = [
        id,
        ...(accountBookmarkedSpacesIds.value[web3.value.account] || [])
      ];
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
      return (
        web3.value.account
          ? accountBookmarkedSpacesIds.value[web3.value.account] || []
          : starredSpacesIds.value
      )
        .map(id => bookmarkedSpacesMap.value.get(id))
        .filter(Boolean) as Space[];
    },
    set(spaces: Space[]) {
      starredSpacesIds.value = spaces
        .filter(space => space.network !== offchainNetworkId.value)
        .map(space => `${space.network}:${space.id}`);

      accountBookmarkedSpacesIds.value[web3.value.account] = spaces.map(
        space => `${space.network}:${space.id}`
      );
    }
  });

  watch(
    starredSpacesIds,
    async (currentIds, previousIds) => {
      if (web3.value.account) {
        accountBookmarkedSpacesIds.value[web3.value.account] = Array.from(
          new Set(
            [...(accountBookmarkedSpacesIds.value[web3.value.account] || []), ...currentIds].filter(
              id => id.startsWith(`${offchainNetworkId.value}:`) || currentIds.includes(id)
            )
          )
        );
      }

      const newIds = !previousIds
        ? currentIds
        : currentIds.filter(
            (id: string) => !previousIds.includes(id) && !bookmarkedSpacesMap.value.has(id)
          );

      if (!newIds.length) {
        starredSpacesLoaded.value = true;
        return;
      }

      const spaces = await getSpaces({
        id_in: newIds.filter(id => !spacesMap.value.has(id))
      });

      starredSpacesLoaded.value = true;
      spacesData.value = [
        ...spacesData.value,
        ...spaces,
        ...(newIds.map(id => spacesMap.value.get(id)).filter(s => !!s) as Space[])
      ];
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
    starredSpacesIds,
    starredSpacesLoaded,
    followedSpacesIds,
    followedSpacesLoaded,
    votes,
    loadVotes,
    toggleSpaceStar
  };
}
