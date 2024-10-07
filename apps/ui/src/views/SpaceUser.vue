<script setup lang="ts">
import {
  _vp,
  autoLinkText,
  getCacheHash,
  getSocialNetworksLink,
  shortenAddress
} from '@/helpers/utils';
import { addressValidator as isValidAddress } from '@/helpers/validation';
import { getNetwork, supportsNullCurrent } from '@/networks';
import { VotingPower, VotingPowerStatus } from '@/networks/types';
import { Space, UserActivity } from '@/types';

const props = defineProps<{ space: Space }>();

const route = useRoute();
const usersStore = useUsersStore();
const { getCurrent } = useMetaStore();
const { isWhiteLabel } = useWhiteLabel();

const userActivity = ref<UserActivity>({
  vote_count: 0,
  proposal_count: 0
} as UserActivity);
const loaded = ref(false);
const votingPowers = ref([] as VotingPower[]);
const votingPowerStatus = ref<VotingPowerStatus>('loading');
// const delegatesCount = ref(0);

const network = computed(() => getNetwork(props.space.network));

const userId = computed(() => route.params.user as string);

const user = computed(() => usersStore.getUser(userId.value));

const socials = computed(() => getSocialNetworksLink(user.value));

const cb = computed(() => getCacheHash(user.value?.avatar));

const formattedVotingPower = computed(() => {
  const votingPower = votingPowers.value.reduce((acc, b) => acc + b.value, 0n);
  const decimals = Math.max(
    ...votingPowers.value.map(votingPower => votingPower.decimals),
    0
  );

  const value = _vp(Number(votingPower) / 10 ** decimals);

  if (props.space.voting_power_symbol) {
    return `${value} ${props.space.voting_power_symbol}`;
  }

  return value;
});

const navigation = computed(() => [
  { label: 'Statement', route: 'space-user-statement' },
  {
    label: 'Proposals',
    route: 'space-user-proposals',
    count: userActivity.value?.proposal_count
  },
  {
    label: 'Votes',
    route: 'space-user-votes',
    count: userActivity.value?.vote_count
  }
  // { label: 'Delegators', route: 'space-user-delegators', count: delegatesCount.value },
]);

async function loadUserActivity() {
  const spaceNetwork = getNetwork(props.space.network);

  const users = await spaceNetwork.api.loadLeaderboard(
    props.space.id,
    {
      limit: 1,
      skip: 0
    },
    'vote_count-desc',
    userId.value
  );

  userActivity.value = users[0] || {
    id: userId.value,
    spaceId: props.space.id,
    vote_count: 0,
    proposal_count: 0
  };
}

// async function loadDelegates() {
//   delegatesCount.value = 0;

//   const delegates = (
//     await Promise.all(
//       props.space.delegations.map(async delegation => {
//         const { getDelegates } = useDelegates(
//           delegation.apiUrl as string,
//           delegation.contractAddress as string
//         );

//         return (
//           await getDelegates({
//             orderBy: 'delegatedVotes',
//             orderDirection: 'asc',
//             skip: 0,
//             first: 1,
//             user: userId.value
//           })
//         )[0];
//       })
//     )
//   )
//     .flat()
//     .filter(delegates => delegates !== undefined);

//   delegatesCount.value = delegates
//     .map(delegate => delegate.tokenHoldersRepresentedAmount || 0)
//     .reduce((a, b) => a + b, 0);
// }

async function getVotingPower() {
  votingPowerStatus.value = 'loading';
  try {
    votingPowers.value = await network.value.actions.getVotingPower(
      props.space.id,
      props.space.strategies,
      props.space.strategies_params,
      props.space.strategies_parsed_metadata,
      userId.value,
      {
        at: supportsNullCurrent(props.space.network)
          ? null
          : getCurrent(props.space.network) || 0,
        chainId: props.space.snapshot_chain_id
      }
    );
    votingPowerStatus.value = 'success';
  } catch (e) {
    console.warn('Failed to load voting power', e);
    votingPowers.value = [];
    votingPowerStatus.value = 'error';
  }
}

watch(
  userId,
  async id => {
    loaded.value = false;

    if (isValidAddress(id)) {
      await usersStore.fetchUser(id);
      await loadUserActivity();
      // loadDelegates();
      getVotingPower();
    }

    loaded.value = true;
  },
  { immediate: true }
);
</script>

<template>
  <UiLoading v-if="!loaded" class="block p-4" />
  <div v-else-if="!user" class="px-4 py-3 flex items-center space-x-2">
    <IH-exclamation-circle class="inline-block" />
    <span>This user does not exist</span>
  </div>
  <div v-else>
    <div
      class="relative bg-skin-border h-[156px] md:h-[140px] mb-[-86px] md:mb-[-70px] top-[-1px]"
    >
      <div class="size-full overflow-hidden">
        <UserCover :user="user" class="!rounded-none w-full min-h-full" />
      </div>
      <div
        class="relative bg-skin-bg h-[16px] -top-3 rounded-t-[16px] md:hidden"
      />
      <div class="absolute right-4 top-4 space-x-2 flex">
        <UiTooltip v-if="!isWhiteLabel" title="View profile">
          <UiButton
            :to="{ name: 'user', params: { user: user.id } }"
            class="!px-0 w-[46px]"
          >
            <IH-user-circle />
          </UiButton>
        </UiTooltip>
        <DropdownShare
          :shareable="{ user, space }"
          type="space-user"
          class="!px-0 w-[46px]"
        />
      </div>
    </div>
    <div class="px-4">
      <div class="mb-5 relative">
        <UiStamp
          :id="user.id"
          :size="90"
          :cb="cb"
          class="relative mb-2 border-4 border-skin-bg !bg-skin-border !rounded-full -left-1"
        />
        <h1 class="break-words" v-text="user.name || shortenAddress(user.id)" />
        <div class="mb-3 text-skin-text">
          <span class="text-skin-link" v-text="userActivity.proposal_count" />
          proposals ·
          <span class="text-skin-link" v-text="userActivity.vote_count" />
          votes
          <template v-if="votingPowerStatus === 'success'">
            ·
            {{ formattedVotingPower }}
          </template>
        </div>
        <div
          v-if="user.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3 break-words"
          v-html="autoLinkText(user.about)"
        />
        <div v-if="socials.length" class="space-x-2 flex">
          <template v-for="social in socials" :key="social.key">
            <a
              :href="social.href"
              target="_blank"
              class="text-[#606060] hover:text-skin-link"
            >
              <component :is="social.icon" class="size-[26px]" />
            </a>
          </template>
        </div>
      </div>
    </div>
    <UiScrollerHorizontal
      class="z-40 sticky top-[71px] lg:top-[72px]"
      with-buttons
      gradient="xxl"
    >
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <AppLink
          v-for="(item, i) in navigation"
          :key="i"
          :to="{ name: item.route, params: { user: userId } }"
        >
          <UiLink
            :is-active="route.name === item.route"
            :text="item.label"
            :count="item.count"
          />
        </AppLink>
      </div>
    </UiScrollerHorizontal>
    <router-view :user="user" :space="space" />
  </div>
</template>
