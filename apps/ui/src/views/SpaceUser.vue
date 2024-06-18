<script setup lang="ts">
import { getNames } from '@/helpers/stamp';
import { addressValidator as isValidAddress } from '@/helpers/validation';
import { autoLinkText, getCacheHash, getSocialNetworksLink, shortenAddress } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import type { Space, User } from '@/types';

const props = defineProps<{ space: Space }>();

const route = useRoute();
const usersStore = useUsersStore();
const spacesStore = useSpacesStore();
const { param } = useRouteParser('id');
const { resolved, address, networkId } = useResolve(param);
const { setTitle } = useTitle();
const userStat = ref<User>({ vote_count: 0, proposal_count: 0 } as User);

const loaded = ref(false);
const placeholderUser = ref<User | null>(null);

const userId = computed(() => route.params.user as string);

const user = computed(() => usersStore.getUser(userId.value) || placeholderUser.value);

const socials = computed(() => getSocialNetworksLink(user.value));

const shareMsg = computed(() => encodeURIComponent(window.location.href));

const cb = computed(() => getCacheHash(user.value?.avatar));

const navigation = computed(() => [
  { label: 'Statement', route: 'space-user-statement' },
  { label: 'Delegators', route: 'space-user-delegators' },
  { label: 'Proposals', route: 'space-user-proposals', count: userStat.value?.proposal_count },
  { label: 'Votes', route: 'space-user-votes', count: userStat.value?.vote_count }
]);

async function loadUserMeta() {
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

  if (users[0]) userStat.value = users[0];
}

watch(
  userId,
  async id => {
    placeholderUser.value = null;
    loaded.value = false;
    await usersStore.fetchUser(id);

    if (isValidAddress(id)) {
      if (!usersStore.getUser(id)) {
        placeholderUser.value = {
          id,
          proposal_count: 0,
          vote_count: 0,
          created: Date.now() / 1000,
          name: (await getNames([id]))?.[id]
        };
      }
      await loadUserMeta();
    }

    loaded.value = true;
  },
  { immediate: true }
);

watch(
  [resolved, networkId, address],
  async ([resolved, networkId, address]) => {
    if (!resolved || !networkId || !address) return;

    spacesStore.fetchSpace(address, networkId);
  },
  {
    immediate: true
  }
);

watchEffect(() => setTitle(`${user.value?.name || userId.value} ${props.space.name}'s profile`));
</script>

<template>
  <UiLoading v-if="!loaded" class="block p-4" />
  <div v-else-if="!user" class="px-4 py-3 flex items-center space-x-2">
    <IH-exclamation-circle class="inline-block" />
    <span>This user does not exist</span>
  </div>
  <div v-else>
    <div class="relative bg-skin-border h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px] top-[-1px]">
      <div class="w-full h-full overflow-hidden">
        <UserCover :user="user" class="!rounded-none w-full min-h-full" />
      </div>
      <div class="relative bg-skin-bg h-[16px] top-[-16px] rounded-t-[16px] md:hidden" />
      <div class="absolute right-4 top-4 space-x-2 flex">
        <UiTooltip title="View profile">
          <router-link :to="{ name: 'user', params: { id: user.id } }" tabindex="-1">
            <UiButton class="!px-0 w-[46px]">
              <IH-user-circle class="inline-block" />
            </UiButton>
          </router-link>
        </UiTooltip>
        <DropdownShare :message="shareMsg" class="!px-0 w-[46px]" />
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
        <div class="mb-3 text-skin-text">
          <span class="text-skin-link" v-text="userStat.proposal_count" />
          proposals ·
          <span class="text-skin-link" v-text="userStat.vote_count" />
          votes · VOTINGPOWER
        </div>
        <div
          v-if="user.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3"
          v-html="autoLinkText(user.about)"
        />
        <div v-if="socials.length" class="space-x-2 flex">
          <template v-for="social in socials" :key="social.key">
            <a :href="social.href" target="_blank" class="text-[#606060] hover:text-skin-link">
              <component :is="social.icon" class="w-[26px] h-[26px]" />
            </a>
          </template>
        </div>
      </div>
    </div>
    <div class="overflow-y-scroll no-scrollbar z-40 sticky top-[71px] lg:top-[72px]">
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <router-link
          v-for="(item, i) in navigation"
          :key="i"
          :to="{ name: item.route, params: { user: userId } }"
        >
          <UiLink :is-active="route.name === item.route" :text="item.label" :count="item.count" />
        </router-link>
      </div>
    </div>
    <router-view :user="user" :space="space" />
  </div>
</template>
