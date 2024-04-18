import { getNetwork } from '@/networks';
import type { NetworkID, Proposal, Space, Vote } from '@/types';
import pkg from '../../package.json';

const votes = ref<Record<Proposal['id'], Vote>>({});
const follows = ref<Space['id'][]>([]);
const followsLoaded = ref(false);
const starredSpacesIds = useStorage(`${pkg.name}.spaces-starred`, [] as string[]);
const starredSpacesData = ref<Space[]>([]);
const starredSpacesLoaded = ref(false);

export function useAccount() {
  const { web3, web3Account } = useWeb3();
  const { mixpanel } = useMixpanel();
  const { spacesMap, getSpaces } = useSpaces();

  async function loadVotes(networkId: NetworkID, spaceId?: string) {
    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceId, account);

    votes.value = { ...votes.value, ...userVotes };
  }

  async function loadFollows(networkId: NetworkID) {
    const { account, type } = web3.value;
    if (!account || type === 'argentx') {
      follows.value = [];
      followsLoaded.value = true;
      return;
    }

    const network = getNetwork(networkId);
    follows.value = (await network.api.loadFollows(account)).map(follow => follow.space.id);
    followsLoaded.value = true;
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

  watchEffect(() => {
    if (!web3Account.value) {
      votes.value = {};
      follows.value = [];
    }
  });

  return {
    starredSpacesIds,
    starredSpaces,
    starredSpacesLoaded,
    account: web3.value.account,
    loadVotes,
    loadFollows,
    votes,
    follows,
    followsLoaded,
    toggleSpaceStar
  };
}
