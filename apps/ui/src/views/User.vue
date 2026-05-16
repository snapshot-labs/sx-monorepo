<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { getUserStats } from '@/helpers/efp';
import {
  _n,
  _p,
  autoLinkText,
  compareAddresses,
  getCacheHash,
  getSocialNetworksLink,
  shortenAddress
} from '@/helpers/utils';
import { addressValidator as isValidAddress } from '@/helpers/validation';
import { enabledNetworks, getNetwork } from '@/networks';
import { getSpaces } from '@/queries/spaces';
import { Space, UserActivity } from '@/types';

const queryClient = useQueryClient();
const route = useRoute();
const usersStore = useUsersStore();
const { web3 } = useWeb3();
const { setTitle } = useTitle();

const activities = ref<
  (UserActivity & {
    space: Space;
    proposal_percentage: number;
    vote_percentage: number;
  })[]
>([]);
const loadingActivities = ref(false);
const modalOpenEditUser = ref(false);
const loaded = ref(false);

const userMetadata = reactive({
  loading: false,
  loaded: false,
  followers_count: 0,
  following_count: 0
});

const id = computed(() => route.params.user as string);

const user = computed(() => usersStore.getUser(id.value));

const socials = computed(() => getSocialNetworksLink(user.value));

const cb = computed(() => getCacheHash(user.value?.avatar));

async function loadUserMetadata(userId: string) {
  userMetadata.loading = true;

  try {
    const userStats = await getUserStats(userId);

    userMetadata.followers_count = userStats.followers_count;
    userMetadata.following_count = userStats.following_count;
    userMetadata.loading = false;
    userMetadata.loaded = true;
  } catch {
    userMetadata.loading = false;
  }
}

async function fetchSpacesAndStore(ids: string[]) {
  if (!ids.length) return;

  const unavailableIds = ids.filter(
    id => !queryClient.getQueryData(['spaces', 'detail', id])
  );

  const spaces = await getSpaces({
    id_in: unavailableIds
  });

  for (const space of spaces) {
    queryClient.setQueryData(
      ['spaces', 'detail', `${space.network}:${space.id}`],
      space
    );
  }
}

async function loadActivities(userId: string) {
  loadingActivities.value = true;

  try {
    const results = await Promise.all(
      enabledNetworks.map(networkId =>
        getNetwork(networkId).api.loadUserActivities(userId)
      )
    );

    const aggregatedActivities = results
      .flat()
      .sort(
        (a, b) =>
          b.vp_value - a.vp_value ||
          b.proposal_count - a.proposal_count ||
          b.vote_count - a.vote_count
      );

    await fetchSpacesAndStore(
      aggregatedActivities.map(activity => activity.spaceId)
    );

    const totalProposals = aggregatedActivities.reduce(
      (a, b) => a + b.proposal_count,
      0
    );
    const totalVotes = aggregatedActivities.reduce(
      (a, b) => a + b.vote_count,
      0
    );

    activities.value = aggregatedActivities
      .map((activity: UserActivity) => {
        const space = queryClient.getQueryData<Space>([
          'spaces',
          'detail',
          activity.spaceId
        ]);

        if (!space) return;

        return {
          ...activity,
          space,
          proposal_percentage:
            totalProposals > 0 ? activity.proposal_count / totalProposals : 0,
          vote_percentage: totalVotes > 0 ? activity.vote_count / totalVotes : 0
        };
      })
      .filter(activity => activity !== undefined);
  } finally {
    loadingActivities.value = false;
  }
}

watch(
  id,
  async userId => {
    loaded.value = false;
    userMetadata.loaded = false;

    if (!isValidAddress(userId)) {
      loaded.value = true;
      return;
    }

    await usersStore.fetchUser(userId);
    loadActivities(userId);
    loadUserMetadata(userId);

    loaded.value = true;
  },
  { immediate: true }
);

watchEffect(() => setTitle(`${user.value?.name || id.value} user profile`));
</script>

<template>
  <UiLoading v-if="!loaded" class="block p-4" />
  <UiStateWarning v-else-if="!user" class="px-4 py-3">
    This user does not exist
  </UiStateWarning>
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
        <DropdownShare :shareable="user" type="user" class="!px-0 w-[46px]" />
        <UiTooltip
          v-if="compareAddresses(web3.account, user.id)"
          title="Edit profile"
        >
          <UiButton uniform @click="modalOpenEditUser = true">
            <IH-cog />
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <div class="px-4">
      <div class="mb-5 relative">
        <UiStamp
          :id="user.id"
          :size="90"
          :cb="cb"
          class="relative mb-2 border-[4px] border-skin-bg !bg-skin-border !rounded-full left-[-4px]"
        />
        <h1 class="break-words" v-text="user.name || shortenAddress(user.id)" />
        <div class="mb-3 flex flex-col xs:flex-row xs:items-center gap-x-2">
          <UiAddress :address="user.id" copy-button="always" />
          <div v-if="userMetadata.loaded" class="flex items-center gap-2">
            <span class="hidden xs:inline">·</span>
            <AppLink :to="`https://ethfollow.xyz/${user.id}`">
              {{ _n(userMetadata.following_count) }}
              <span class="text-skin-text">following</span>
            </AppLink>
            ·
            <AppLink :to="`https://ethfollow.xyz/${user.id}`">
              {{ _n(userMetadata.followers_count) }}
              <span class="text-skin-text">followers</span>
            </AppLink>
          </div>
        </div>
        <div
          v-if="user.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3 break-words"
          v-html="autoLinkText(user.about)"
        />
        <div v-if="socials.length" class="space-x-2 flex">
          <template v-for="social in socials" :key="social.key">
            <AppLink
              :to="social.href"
              class="text-skin-text hover:text-skin-link"
            >
              <component :is="social.icon" class="size-[26px]" />
            </AppLink>
          </template>
        </div>
      </div>
    </div>
    <UiSectionHeader label="Activity" sticky />
    <UiColumnHeader class="text-right">
      <span class="w-[40%] text-left truncate">Space</span>
      <span class="w-[20%] truncate">Proposals</span>
      <span class="w-[20%] truncate">Votes</span>
      <span class="w-[20%] truncate">VP value</span>
    </UiColumnHeader>
    <UiLoading v-if="loadingActivities" class="px-4 py-3 block" />
    <UiStateWarning v-else-if="!activities.length" class="px-4 py-3">
      This user does not have any activities yet.
    </UiStateWarning>
    <AppLink
      v-for="activity in activities"
      v-else
      :key="activity.id"
      :to="{
        name: 'space-user-statement',
        params: {
          space: activity.spaceId,
          user: user.id
        }
      }"
      class="mx-4 border-b flex space-x-1 py-3"
    >
      <div
        class="flex items-center gap-x-3 leading-[22px] w-[40%] font-semibold text-skin-link truncate"
      >
        <SpaceAvatar
          :space="activity.space"
          :size="32"
          class="!rounded-[4px]"
        />
        <span class="flex-auto w-0 truncate" v-text="activity.space.name" />
      </div>
      <div
        class="flex flex-col justify-center text-right w-[20%] leading-[22px] truncate"
      >
        <h4
          class="text-skin-link truncate"
          v-text="_n(activity.proposal_count)"
        />
        <div
          class="text-[17px] text-skin-text truncate"
          v-text="_p(activity.proposal_percentage)"
        />
      </div>
      <div
        class="flex flex-col justify-center text-right w-[20%] leading-[22px] truncate"
      >
        <h4 class="text-skin-link truncate" v-text="_n(activity.vote_count)" />
        <div
          class="text-[17px] text-skin-text truncate"
          v-text="_p(activity.vote_percentage)"
        />
      </div>
      <div
        class="flex flex-col justify-center text-right w-[20%] leading-[22px] truncate"
      >
        <h4 class="text-skin-link truncate" v-text="_n(activity.vp_value)" />
        <div class="text-[17px] truncate">USD</div>
      </div>
    </AppLink>
    <teleport to="#modal">
      <ModalEditUser
        v-if="compareAddresses(web3.account, user.id)"
        :open="modalOpenEditUser"
        :user="user"
        @close="modalOpenEditUser = false"
      />
    </teleport>
  </div>
</template>
