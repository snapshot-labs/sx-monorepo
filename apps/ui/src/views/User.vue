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
const { copy, copied } = useClipboard();

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
          b.proposal_count - a.proposal_count || b.vote_count - a.vote_count
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
        <DropdownShare :shareable="user" type="user" class="!px-0 w-[46px]" />
        <UiTooltip
          v-if="compareAddresses(web3.account, user.id)"
          title="Edit profile"
        >
          <UiButton class="!px-0 w-[46px]" @click="modalOpenEditUser = true">
            <IH-cog class="inline-block" />
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
        <div class="mb-3 flex items-center space-x-2">
          <span class="text-skin-text" v-text="shortenAddress(user.id)" />
          <UiTooltip title="Copy address">
            <button
              type="button"
              class="text-skin-text"
              @click.prevent="copy(user.id)"
            >
              <IH-duplicate v-if="!copied" class="inline-block" />
              <IH-check v-else class="inline-block" />
            </button>
          </UiTooltip>
          <span v-if="userMetadata.loaded">
            ·
            <a :href="`https://ethfollow.xyz/${user.id}`" target="_blank">
              {{ _n(userMetadata.following_count) }}
              <span class="text-skin-text">following</span>
            </a>
            ·
            <a :href="`https://ethfollow.xyz/${user.id}`" target="_blank">
              {{ _n(userMetadata.followers_count) }}
              <span class="text-skin-text">followers</span>
            </a>
          </span>
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
              class="text-skin-text hover:text-skin-link"
            >
              <component :is="social.icon" class="size-[26px]" />
            </a>
          </template>
        </div>
      </div>
      <h4 class="mb-2 eyebrow leading-8">Activity</h4>
    </div>
    <div class="border-b w-full">
      <div class="flex space-x-1 px-4 leading-8">
        <span class="w-[60%] lg:w-[50%] truncate">Space</span>
        <span class="w-[20%] lg:w-[25%] text-right truncate">Proposals</span>
        <span class="w-[20%] lg:w-[25%] text-right truncate">Votes</span>
      </div>
    </div>
    <UiLoading v-if="loadingActivities" class="px-4 py-3 block" />
    <div
      v-else-if="!activities.length"
      class="px-4 py-3 flex items-center space-x-2"
    >
      <IH-exclamation-circle class="inline-block" />
      <span>This user does not have any activities yet.</span>
    </div>
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
        class="flex items-center gap-x-3 leading-[22px] w-[60%] lg:w-[50%] font-semibold text-skin-link truncate"
      >
        <SpaceAvatar
          :space="activity.space"
          :size="32"
          class="!rounded-[4px]"
        />
        <span class="flex-auto w-0 truncate" v-text="activity.space.name" />
      </div>
      <div
        class="flex flex-col justify-center text-right w-[20%] lg:w-[25%] leading-[22px] truncate"
      >
        <h4
          class="text-skin-link truncate"
          v-text="_n(activity.proposal_count)"
        />
        <div
          class="text-[17px] truncate"
          v-text="_p(activity.proposal_percentage)"
        />
      </div>
      <div
        class="flex flex-col justify-center text-right w-[20%] lg:w-[25%] leading-[22px] truncate"
      >
        <h4 class="text-skin-link truncate" v-text="_n(activity.vote_count)" />
        <div
          class="text-[17px] truncate"
          v-text="_p(activity.vote_percentage)"
        />
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
