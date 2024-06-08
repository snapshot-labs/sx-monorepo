<script setup lang="ts">
import { shortenAddress, sanitizeUrl, autoLinkText, _n, _p, getCacheHash } from '@/helpers/utils';
import ICX from '~icons/c/x';
import ICGithub from '~icons/c/github';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { UserActivity, Space, User } from '@/types';
import { validateAndParseAddress } from 'starknet';
import { isAddress } from '@ethersproject/address';
import { getNames } from '@/helpers/stamp';

const route = useRoute();
const usersStore = useUsersStore();
const spacesStore = useSpacesStore();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const { copy, copied } = useClipboard();

const currentUrl = `${window.location.origin}/#${route.path}`;

const activities = ref<
  (UserActivity & { space: Space; proposal_percentage: number; vote_percentage: number })[]
>([]);
const loadingActivities = ref(false);
const modalOpenEditUser = ref(false);
const loaded = ref(false);

const id = computed(() => route.params.id as string);
const user = computed(
  () =>
    usersStore.getUser(id.value) ||
    (isValidAddress(id.value)
      ? ({
          id: id.value,
          about: '',
          name: '',
          avatar: '',
          cover: '',
          github: '',
          twitter: ''
        } as User)
      : null)
);
const socials = computed(() =>
  [
    { key: 'twitter', icon: ICX, urlFormat: 'https://twitter.com/$' },
    { key: 'github', icon: ICGithub, urlFormat: 'https://github.com/$' }
  ]
    .map(({ key, icon, urlFormat }) => {
      const value = user.value?.[key];
      const href = value ? sanitizeUrl(urlFormat.replace('$', value)) : null;

      return href ? { key, icon, href } : {};
    })
    .filter(social => social.href)
);
const shareMsg = computed(() => encodeURIComponent(`${id.value}: ${currentUrl}`));
const cb = computed(() => getCacheHash(user.value?.avatar));
const username = computedAsync(
  async () =>
    user.value?.name || (await getNames([id.value]))?.[id.value] || shortenAddress(id.value)
);

async function loadActivities(userId: string) {
  loadingActivities.value = true;

  const results = await Promise.all(
    enabledNetworks.map(networkId => {
      const network = getNetwork(networkId);
      return network.api.loadUserActivities(userId);
    })
  );

  const _activities = results
    .flat()
    .sort((a, b) => b.proposal_count - a.proposal_count || b.vote_count - a.vote_count);

  await spacesStore.fetchSpaces(
    _activities.map(activity => activity.spaceId).filter(id => !spacesStore.spacesMap.has(id))
  );

  const total_proposals = _activities
    .map(activity => activity.proposal_count)
    .reduce((a, b) => a + b, 0);

  const total_votes = _activities.map(activity => activity.vote_count).reduce((a, b) => a + b, 0);

  activities.value = _activities.map(activity => ({
    ...activity,
    space: spacesStore.spacesMap.get(activity.spaceId)!,
    proposal_percentage: activity.proposal_count / total_proposals,
    vote_percentage: activity.vote_count / total_votes
  }));

  loadingActivities.value = false;
}

function isOffchainSpace(space: Space) {
  return offchainNetworks.includes(space.network);
}

function isValidAddress(address: string) {
  try {
    return !!validateAndParseAddress(address);
  } catch (e) {
    return isAddress(address);
  }
}

onMounted(async () => {
  await usersStore.fetchUser(id.value);

  if (isValidAddress(id.value)) await loadActivities(id.value);

  loaded.value = true;
});

watchEffect(() => setTitle(`${id.value} user profile`));
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
        <UiDropdown>
          <template #button>
            <UiButton class="!px-0 w-[46px]">
              <IH-share class="inline-block" />
            </UiButton>
          </template>
          <template #items>
            <UiDropdownItem v-slot="{ active }">
              <a
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
                :href="`https://twitter.com/intent/tweet/?text=${shareMsg}`"
                target="_blank"
              >
                <IC-x />
                Share on X
              </a>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <a
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
                :href="`https://hey.xyz/?hashtags=Snapshot&text=${shareMsg}`"
                target="_blank"
              >
                <IC-lens />
                Share on Lens
              </a>
            </UiDropdownItem>
            <UiDropdownItem v-slot="{ active }">
              <a
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
                :href="`https://warpcast.com/~/compose?text=${shareMsg}`"
                target="_blank"
              >
                <IC-farcaster />
                Share on Farcaster
              </a>
            </UiDropdownItem>
          </template>
        </UiDropdown>

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
        <h1 v-text="username" />
        <div class="mb-3 flex items-center space-x-2">
          <span class="text-skin-text" v-text="shortenAddress(user.id)" />
          <UiTooltip title="Copy address">
            <a href="#" class="text-skin-text" @click.prevent="copy(user.id)">
              <IH-duplicate v-if="!copied" class="inline-block" />
              <IH-check v-else class="inline-block" />
            </a>
          </UiTooltip>
        </div>
        <div
          v-if="user.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3"
          v-html="autoLinkText(user.about)"
        />
        <div v-if="socials.length > 0" class="space-x-2 flex">
          <template v-for="social in socials" :key="social.key">
            <a :href="social.href" target="_blank" class="text-[#606060] hover:text-skin-link">
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
        <span class="w-[20%] lg:w-[25%] truncate">Proposals</span>
        <span class="w-[20%] lg:w-[25%] truncate">Votes</span>
        <span class="hidden lg:block lg:w-[88px]"></span>
      </div>
    </div>
    <UiLoading v-if="loadingActivities" class="px-4 py-3 block" />
    <div v-else-if="activities.length === 0" class="px-4 py-3 flex items-center space-x-2">
      <IH-exclamation-circle class="inline-block" />
      <span>This user does not have any activities yet.</span>
    </div>
    <div
      v-for="(activity, i) in activities"
      v-else
      :key="i"
      class="mx-4 border-b flex space-x-1 py-3"
    >
      <router-link
        :to="{
          name: 'space-overview',
          params: {
            id: activity.spaceId
          }
        }"
        class="flex items-center gap-x-3 leading-[22px] w-[60%] lg:w-[50%] font-semibold text-skin-link truncate"
      >
        <SpaceAvatar
          :space="activity.space"
          :size="32"
          :type="isOffchainSpace(activity.space) ? 'space' : 'space-sx'"
          class="rounded-sm"
        />
        <span class="truncate" v-text="activity.space.name" />
      </router-link>
      <div class="flex flex-col justify-center w-[20%] lg:w-[25%] leading-[22px] truncate">
        <h4 class="text-skin-link truncate" v-text="_n(activity.proposal_count)" />
        <div class="text-[17px] truncate" v-text="_p(activity.proposal_percentage)" />
      </div>
      <div class="flex flex-col justify-center w-[20%] lg:w-[25%] leading-[22px] truncate">
        <h4 class="text-skin-link truncate" v-text="_n(activity.vote_count)" />
        <div class="text-[17px] truncate" v-text="_p(activity.vote_percentage)" />
      </div>
      <div class="hidden lg:block lg:w-[88px] text-right">
        <router-link
          :to="{
            name: 'space-overview',
            params: {
              id: activity.spaceId
            }
          }"
          class="text-skin-link"
        >
          <UiButton class="!px-0 w-[40px] !h-[40px]">
            <IH-arrow-sm-right class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <teleport to="#modal">
      <ModalEditUser
        v-if="user && web3.account === user.id"
        :open="modalOpenEditUser"
        :user="user"
        @close="modalOpenEditUser = false"
      />
    </teleport>
  </div>
</template>
