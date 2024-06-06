<script setup lang="ts">
import autolinker from 'autolinker';
import { shortenAddress, sanitizeUrl } from '@/helpers/utils';
import ICX from '~icons/c/x';
import ICDiscord from '~icons/c/discord';
import ICGithub from '~icons/c/github';
import ICCoingecko from '~icons/c/coingecko';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';

const route = useRoute();
const usersStore = useUsersStore();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const { copy, copied } = useClipboard();

const id = route.params.id as string;

const user = computed(() => usersStore.getUser(id));
const socials = computed(() =>
  [
    { key: 'external_url', icon: IHGlobeAlt, urlFormat: '$' },
    { key: 'twitter', icon: ICX, urlFormat: 'https://twitter.com/$' },
    { key: 'discord', icon: ICDiscord, urlFormat: 'https://discord.gg/$' },
    { key: 'coingecko', icon: ICCoingecko, urlFormat: 'https://www.coingecko.com/coins/$' },
    { key: 'github', icon: ICGithub, urlFormat: 'https://github.com/$' }
  ]
    .map(({ key, icon, urlFormat }) => {
      const value = user.value?.[key];
      const href = value ? sanitizeUrl(urlFormat.replace('$', value)) : null;

      return href ? { key, icon, href } : {};
    })
    .filter(social => social.href)
);

const autolinkedAbout = computed(() =>
  autolinker.link(user.value?.about || '', {
    sanitizeHtml: true,
    phone: false,
    replaceFn: match => match.buildTag().setAttr('href', sanitizeUrl(match.getAnchorHref())!)
  })
);
onMounted(() => usersStore.fetchUser(id));

watchEffect(() => setTitle(`${id} user profile`));
</script>

<template>
  <UiLoading v-if="!user" class="block text-center p-4" />
  <div v-else>
    <div class="relative bg-skin-border h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px] top-[-1px]">
      <div class="w-full h-full overflow-hidden">
        <UserCover :user="user" class="!rounded-none w-full min-h-full" />
      </div>
      <div class="relative bg-skin-bg h-[16px] top-[-16px] rounded-t-[16px] md:hidden" />
      <div class="absolute right-4 top-4 space-x-2">
        <UiTooltip title="Share">
          <UiButton class="!px-0 w-[46px]">
            <IH-share class="inline-block" />
          </UiButton>
        </UiTooltip>
        <UiTooltip v-if="web3.account === user.id" title="Edit profile">
          <UiButton class="!px-0 w-[46px]">
            <IH-cog class="inline-block" />
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <div class="px-4">
      <div class="mb-4 relative">
        <UiStamp
          :id="user.id"
          :size="90"
          class="relative mb-2 border-[4px] border-skin-bg !bg-skin-border !rounded-full left-[-4px]"
        />

        <h1>{{ user.name || shortenAddress(user.id) }}</h1>
        <div class="mb-3 flex items-center space-x-2">
          <span class="text-skin-text">{{ shortenAddress(user.id) }}</span>
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
          v-html="autolinkedAbout"
        />
        <div v-if="socials.length > 0" class="space-x-2 flex">
          <template v-for="social in socials" :key="social.key">
            <a :href="social.href" target="_blank" class="text-[#606060] hover:text-skin-link">
              <component :is="social.icon" class="w-[26px] h-[26px]" />
            </a>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
