<script setup lang="ts">
import { useSpacesStore } from '@/stores/spaces';
import { useProposalsStore } from '@/stores/proposals';
import { _n, compareAddresses, sanitizeUrl } from '@/helpers/utils';
import { Space, Proposal as ProposalType } from '@/types';

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
const spaceIsEditable = computed(() =>
  compareAddresses(props.space.controller, web3.value.account)
);

const externalUrl = computed(() => sanitizeUrl(props.space.external_url));
const twitterUrl = computed(() =>
  props.space.twitter ? sanitizeUrl(`https://twitter.com/${props.space.twitter}`) : null
);
const discordUrl = computed(() =>
  props.space.discord ? sanitizeUrl(`https://discord.gg/${props.space.discord}`) : null
);
const githubUrl = computed(() =>
  props.space.github ? sanitizeUrl(`https://github.com/${props.space.github}`) : null
);

const proposalsRecord = computed(() => proposalsStore.proposals[spaceIdComposite]);

const grouped = computed(() => {
  const initialValue = {
    active: [] as ProposalType[],
    ended: [] as ProposalType[]
  };

  if (!proposalsRecord.value) return initialValue;

  return proposalsRecord.value.summaryProposals.reduce((v, proposal) => {
    if (proposal.has_ended) v.ended.push(proposal);
    else v.active.push(proposal);

    return v;
  }, initialValue);
});

watchEffect(() => {
  setTitle(props.space.name);
});
</script>

<template>
  <div>
    <div class="relative bg-skin-border h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px] top-[-1px]">
      <div class="w-full h-full overflow-hidden">
        <SpaceCover
          v-if="props.space.cover"
          :space="props.space"
          class="!rounded-none w-full min-h-full object-cover"
        />
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
        <UiTooltip v-if="spaceIsEditable" title="Edit profile">
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
            type="space-sx"
            class="relative mb-2 border-[4px] border-skin-bg !bg-skin-border !rounded-lg left-[-4px]"
          />
        </router-link>
        <h1 v-text="space.name" />
        <div class="mb-3">
          <b class="text-skin-link">{{ _n(space.proposal_count) }}</b> proposals ·
          <b class="text-skin-link">{{ _n(space.vote_count) }}</b> votes
        </div>
        <div class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3">
          <span v-if="space.about">
            {{ space.about }}
          </span>
        </div>
        <div class="space-x-2">
          <a v-if="externalUrl" :href="externalUrl" target="_blank">
            <IH-globe-alt class="w-[26px] h-[26px] inline-block text-[#606060]" />
          </a>
          <a v-if="twitterUrl" :href="twitterUrl" target="_blank">
            <img src="~@/assets/twitter.svg" class="w-[26px] h-[26px] inline-block" />
          </a>
          <a v-if="discordUrl" :href="discordUrl" target="_blank">
            <img src="~@/assets/discord.svg" class="w-[26px] h-[26px] inline-block" />
          </a>
          <a v-if="githubUrl" :href="githubUrl" target="_blank">
            <img src="~@/assets/github.svg" class="w-[26px] h-[26px] inline-block" />
          </a>
        </div>
      </div>
    </div>
    <div>
      <ProposalsList
        title="Active proposals"
        :loading="!proposalsRecord?.summaryLoaded"
        :limit="PROPOSALS_LIMIT - 1"
        :proposals="grouped.active"
        :route="{
          name: 'space-proposals',
          linkTitle: 'See more'
        }"
      />
      <ProposalsList
        title="Closed proposals"
        :loading="!proposalsRecord?.summaryLoaded"
        :limit="PROPOSALS_LIMIT - 1"
        :proposals="grouped.ended"
        :route="{
          name: 'space-proposals',
          linkTitle: 'See more'
        }"
        class="mt-4"
      />
    </div>
  </div>
  <teleport to="#modal">
    <ModalEditSpace :open="editSpaceModalOpen" :space="space" @close="editSpaceModalOpen = false" />
  </teleport>
</template>
