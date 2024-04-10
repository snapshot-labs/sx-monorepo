<script setup lang="ts">
import autolinker from 'autolinker';
import { _n, compareAddresses, sanitizeUrl } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';
import ICX from '~icons/c/x';
import ICDiscord from '~icons/c/discord';
import ICGithub from '~icons/c/github';
import ICCoingecko from '~icons/c/coingecko';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';

const PROPOSALS_LIMIT = 4;

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const spacesStore = useSpacesStore();
const proposalsStore = useProposalsStore();

const editSpaceModalOpen = ref(false);

onMounted(() => {
  proposalsStore.fetchSummary(props.space.id, props.space.network, PROPOSALS_LIMIT);
});

const spaceIdComposite = `${props.space.network}:${props.space.id}`;

const spaceStarred = computed(() => spacesStore.starredSpacesIds.includes(spaceIdComposite));
const isController = computed(() => compareAddresses(props.space.controller, web3.value.account));

const socials = computed(() =>
  [
    { key: 'external_url', icon: IHGlobeAlt, urlFormat: '$' },
    { key: 'twitter', icon: ICX, urlFormat: 'https://twitter.com/$' },
    { key: 'discord', icon: ICDiscord, urlFormat: 'https://discord.gg/$' },
    { key: 'coingecko', icon: ICCoingecko, urlFormat: 'https://www.coingecko.com/coins/$' },
    { key: 'github', icon: ICGithub, urlFormat: 'https://github.com/$' }
  ]
    .map(({ key, icon, urlFormat }) => {
      const value = props.space[key];
      const href = value ? sanitizeUrl(urlFormat.replace('$', value)) : null;

      return href ? { key, icon, href } : {};
    })
    .filter(social => social.href)
);

const proposalsRecord = computed(() => proposalsStore.proposals[spaceIdComposite]);

const autolinkedAbout = computed(() =>
  autolinker.link(props.space.about || '', {
    sanitizeHtml: true,
    phone: false,
    replaceFn: match => match.buildTag().setAttr('href', sanitizeUrl(match.getAnchorHref())!)
  })
);

watchEffect(() => setTitle(props.space.name));
</script>

<template>
  <div>
    <div class="relative bg-skin-border h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px] top-[-1px]">
      <div class="w-full h-full overflow-hidden">
        <SpaceCover :space="props.space" class="!rounded-none w-full min-h-full" />
      </div>
      <div class="relative bg-skin-bg h-[16px] top-[-16px] rounded-t-[16px] md:hidden" />
      <div class="absolute right-4 top-4 space-x-2">
        <router-link :to="{ name: 'editor' }">
          <UiTooltip title="New proposal">
            <UiButton class="!px-0 w-[46px]">
              <IH-pencil-alt class="inline-block" />
            </UiButton>
          </UiTooltip>
        </router-link>
        <UiTooltip v-if="isController" title="Edit profile">
          <UiButton class="!px-0 w-[46px]" @click="editSpaceModalOpen = true">
            <IH-cog class="inline-block" />
          </UiButton>
        </UiTooltip>
        <UiTooltip :title="spaceStarred ? 'Remove from favorites' : 'Add to favorites'">
          <UiButton class="w-[46px] !px-0" @click="spacesStore.toggleSpaceStar(spaceIdComposite)">
            <IS-star v-if="spaceStarred" class="inline-block" />
            <IH-star v-else class="inline-block" />
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <div class="px-4">
      <div class="mb-4 relative">
        <router-link :to="{ name: 'space-overview' }">
          <SpaceAvatar
            :space="space"
            :size="90"
            :type="offchainNetworks.includes(space.network) ? 'space' : 'space-sx'"
            class="relative mb-2 border-[4px] border-skin-bg !bg-skin-border !rounded-lg left-[-4px]"
          />
        </router-link>
        <div class="flex items-center">
          <h1 v-text="space.name" />
          <UiBadgeVerified class="ml-1 top-[2px]" :verified="space.verified" :turbo="space.turbo" />
        </div>
        <div class="mb-3">
          <b class="text-skin-link">{{ _n(space.proposal_count) }}</b> proposals ·
          <b class="text-skin-link">{{ _n(space.vote_count, 'compact') }}</b> votes
          <span v-if="offchainNetworks.includes(space.network)">
            · <b class="text-skin-link">{{ _n(space.follower_count, 'compact') }}</b> followers
          </span>
        </div>
        <div
          v-if="space.about"
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
    <div>
      <ProposalsList
        title="Proposals"
        :loading="!proposalsRecord?.summaryLoaded"
        :limit="PROPOSALS_LIMIT - 1"
        :proposals="proposalsRecord?.summaryProposals ?? []"
        :route="{
          name: 'space-proposals',
          linkTitle: 'See more'
        }"
      />
    </div>
  </div>
  <teleport to="#modal">
    <ModalEditSpace :open="editSpaceModalOpen" :space="space" @close="editSpaceModalOpen = false" />
  </teleport>
</template>
