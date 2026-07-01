<script setup lang="ts">
import {
  autoLinkText,
  getCacheHash,
  getSocialNetworksLink,
  shortenAddress
} from '@/helpers/utils';
import { addressValidator as isValidAddress } from '@/helpers/validation';
import { getNetwork } from '@/networks';
import { NetworkID, Space } from '@/types';

defineProps<{ space: Space }>();

const route = useRoute();
const usersStore = useUsersStore();
const { organization } = useOrganization();

const isLoading = ref(true);
const totalProposalCount = ref(0);
const totalVoteCount = ref(0);

const userId = computed(() => route.params.user as string);

const user = computed(() => usersStore.getUser(userId.value));

const spaces = computed(() => organization.value?.spaces ?? []);

const socials = computed(() => getSocialNetworksLink(user.value));

const cb = computed(() => getCacheHash(user.value?.avatar));

const navigation = computed(() => [
  { label: 'Statement', route: 'space-user-statement' },
  {
    label: 'Proposals',
    route: 'space-user-proposals',
    count: totalProposalCount.value
  },
  {
    label: 'Votes',
    route: 'space-user-votes',
    count: totalVoteCount.value
  }
]);

async function loadActivities(id: string) {
  const networkIds = [
    ...new Set(spaces.value.map(s => s.network))
  ] as NetworkID[];

  const orgSpaceIds = new Set(spaces.value.map(s => `${s.network}:${s.id}`));

  const results = await Promise.all(
    networkIds.map(networkId =>
      getNetwork(networkId).api.loadUserActivities(id)
    )
  );

  const activities = results.flat().filter(a => orgSpaceIds.has(a.spaceId));

  totalProposalCount.value = activities.reduce(
    (sum, a) => sum + a.proposal_count,
    0
  );
  totalVoteCount.value = activities.reduce((sum, a) => sum + a.vote_count, 0);
}

watch(
  userId,
  async id => {
    isLoading.value = true;

    if (isValidAddress(id)) {
      await Promise.all([usersStore.fetchUser(id), loadActivities(id)]);
    }

    isLoading.value = false;
  },
  { immediate: true }
);
</script>

<template>
  <UiLoading v-if="isLoading" class="block p-4" />
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
        <DropdownShare :shareable="{ user, space }" type="space-user" uniform />
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
        <div
          class="mb-3 text-skin-text flex flex-col xs:flex-row flex-wrap xs:items-center gap-x-2 whitespace-nowrap"
        >
          <UiAddress :address="user.id" copy-button="always" />
          <div class="flex items-center gap-2">
            <span class="hidden xs:inline">·</span>
            <div>
              <span class="text-skin-link" v-text="totalProposalCount" />
              proposals
            </div>
            ·
            <div>
              <span class="text-skin-link" v-text="totalVoteCount" />
              votes
            </div>
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
    <UiScrollerHorizontal
      class="z-40 sticky top-header-height-with-offset lg:top-header-height"
      with-buttons
      gradient="xxl"
    >
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <AppLink
          v-for="(item, i) in navigation"
          :key="i"
          v-slot="{ isExactActive }"
          :to="{ name: item.route, params: { user: userId } }"
        >
          <UiLabel
            :is-active="isExactActive"
            :text="item.label"
            :count="item.count"
          />
        </AppLink>
      </div>
    </UiScrollerHorizontal>
    <router-view :user="user" :space="space" :organization="organization" />
  </div>
</template>
