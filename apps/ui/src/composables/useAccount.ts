import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import type { NetworkID, Proposal, Space, Vote } from '@/types';
import pkg from '../../package.json';

const votes = ref<Record<Proposal['id'], Vote>>({});
const followedSpacesIds = ref<Space['id'][]>([]);
const followedSpacesLoaded = ref(false);
const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
const starredOrFollowedSpacesData = ref<Space[]>([]);
const starredSpacesLoaded = ref(false);

export function useAccount() {
  const { web3, web3Account } = useWeb3();
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
    const followsIds = (await network.api.loadFollows(web3.value.account)).map(
      follow => `${offchainNetworkId.value}:${follow.space.id}`
    );
    const newIds = followsIds.filter(id => !followedSpacesIds.value.includes(id));

    if (!newIds.length) {
      followedSpacesLoaded.value = true;
      return;
    }

    const spaces = await getSpaces({
      id_in: newIds.filter(id => !spacesMap.value.has(id))
    });

    followedSpacesLoaded.value = true;
    followedSpacesIds.value = followsIds;

    starredOrFollowedSpacesData.value = [
      ...starredOrFollowedSpacesData.value,
      ...spaces,
      ...(newIds.map(id => spacesMap.value.get(id)).filter(s => !!s) as Space[])
    ];
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

  const starredOrFollowedSpacesMap = computed(
    () =>
      new Map(
        starredOrFollowedSpacesData.value.map(space => [`${space.network}:${space.id}`, space])
      )
  );

  const starredOrFollowedSpaces = computed({
    get() {
      return [...starredSpacesIds.value, ...followedSpacesIds.value]
        .map(id => starredOrFollowedSpacesMap.value.get(id))
        .filter(Boolean) as Space[];
    },
    set(spaces: Space[]) {
      starredSpacesIds.value = spaces.map(space => `${space.network}:${space.id}`);
    }
  });

  watch(
    starredSpacesIds,
    async (currentIds, previousIds) => {
      const newIds = !previousIds
        ? currentIds
        : currentIds.filter(
            (id: string) => !previousIds.includes(id) && !starredOrFollowedSpacesMap.value.has(id)
          );

      if (!newIds.length) {
        starredSpacesLoaded.value = true;
        return;
      }

      const spaces = await getSpaces({
        id_in: newIds.filter(id => !spacesMap.value.has(id))
      });

      starredSpacesLoaded.value = true;
      starredOrFollowedSpacesData.value = [
        ...starredOrFollowedSpacesData.value,
        ...spaces,
        ...(newIds.map(id => spacesMap.value.get(id)).filter(s => !!s) as Space[])
      ];
    },
    { immediate: true }
  );

  watchEffect(() => {
    if (!web3Account.value || web3.value.type === 'argentx') {
      votes.value = {};
      followedSpacesIds.value = [];
    }

    loadFollowedSpaces();
  });

  return {
    account: web3.value.account,
    starredSpacesIds,
    starredOrFollowedSpaces,
    starredSpacesLoaded,
    followedSpacesIds,
    followedSpacesLoaded,
    votes,
    loadVotes,
    toggleSpaceStar
  };
}
