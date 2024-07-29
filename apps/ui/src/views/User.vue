<script setup lang="ts">
import {
  _n,
  _p,
  autoLinkText,
  getCacheHash,
  getSocialNetworksLink,
  shortenAddress
} from '@/helpers/utils';
import { addressValidator as isValidAddress } from '@/helpers/validation';
import { enabledNetworks, getNetwork } from '@/networks';
import { Space, UserActivity } from '@/types';

const route = useRoute();
const usersStore = useUsersStore();
const spacesStore = useSpacesStore();
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

const id = computed(() => route.params.id as string);

const user = computed(() => usersStore.getUser(id.value));

const socials = computed(() => getSocialNetworksLink(user.value));

const shareMsg = computed(() => encodeURIComponent(window.location.href));

const cb = computed(() => getCacheHash(user.value?.avatar));

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

    await spacesStore.fetchSpaces(
      aggregatedActivities
        .map(activity => activity.spaceId)
        .filter(id => !spacesStore.spacesMap.has(id))
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
        const space = spacesStore.spacesMap.get(activity.spaceId);

        if (!space) return;

        return {
          ...activity,
          space,
          proposal_percentage:
            totalProposals > 0 ? activity.proposal_count / totalProposals : 0,
          vote_percentage: totalVotes > 0 ? activity.vote_count / totalVotes : 0
        };
      })
      .filter(Boolean) as typeof activities.value;
  } finally {
    loadingActivities.value = false;
  }
}

watch(
  id,
  async userId => {
    loaded.value = false;

    if (!isValidAddress(userId)) {
      loaded.value = true;
      return;
    }

    await usersStore.fetchUser(userId);
    loadActivities(userId);

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
      class="relative bg-skin-border h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px] top-[-1px]"
    >
      <div class="w-full h-full overflow-hidden">
        <UserCover :user="user" class="!rounded-none w-full min-h-full" />
      </div>
      <div
        class="relative bg-skin-bg h-[16px] top-[-16px] rounded-t-[16px] md:hidden"
      />
      <div class="absolute right-4 top-4 space-x-2 flex">
        <DropdownShare :message="shareMsg" class="!px-0 w-[46px]" />
        <UiTooltip v-if="web3.account === user.id" title="Edit profile">
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
        <h1 v-text="user.name || shortenAddress(user.id)" />
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
        </div>
        <div
          v-if="user.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3"
          v-html="autoLinkText(user.about)"
        />
        <div v-if="socials.length" class="space-x-2 flex">
          <template v-for="social in socials" :key="social.key">
            <a
              :href="social.href"
              target="_blank"
              class="text-[#606060] hover:text-skin-link"
            >
              <component :is="social.icon" class="w-[26px] h-[26px]" />
            </a>
          </template>
        </div>
      </div>
      <h4 class="mb-2 eyebrow leading-8">Activity</h4>
    </div>
    <div class="border-b w-full">
      <div class="flex space-x-1 px-4 leading-8">
        <span class="w-[60%] lg:w-[50%] truncate">Space</span>
        <span class="w-[20%] lg:w-[25%] text-end truncate">Proposals</span>
        <span class="w-[20%] lg:w-[25%] text-end truncate">Votes</span>
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
    <router-link
      v-for="(activity, i) in activities"
      v-else
      :key="i"
      :to="{
        name: 'space-user-statement',
        params: {
          id: activity.spaceId,
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
        <span class="truncate" v-text="activity.space.name" />
      </div>
      <div
        class="flex flex-col justify-center items-end w-[20%] lg:w-[25%] leading-[22px] truncate"
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
        class="flex flex-col justify-center items-end w-[20%] lg:w-[25%] leading-[22px] truncate"
      >
        <h4 class="text-skin-link truncate" v-text="_n(activity.vote_count)" />
        <div
          class="text-[17px] truncate"
          v-text="_p(activity.vote_percentage)"
        />
      </div>
    </router-link>
    <teleport to="#modal">
      <ModalEditUser
        v-if="web3.account === user.id"
        :open="modalOpenEditUser"
        :user="user"
        @close="modalOpenEditUser = false"
      />
    </teleport>
  </div>
</template>
