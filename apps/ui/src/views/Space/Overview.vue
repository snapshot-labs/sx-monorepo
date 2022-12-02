<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useProposalsStore } from '@/stores/proposals';
import { Space, Proposal as ProposalType } from '@/types';

const PROPOSALS_LIMIT = 4;

const props = defineProps<{ space: Space }>();

const proposalsStore = useProposalsStore();

onMounted(() => {
  proposalsStore.fetchSummary(props.space.id, PROPOSALS_LIMIT);
});

const proposalsRecord = computed(() => proposalsStore.proposals[props.space.id]);

const grouped = computed(() => {
  const initialValue = {
    active: [] as ProposalType[],
    ended: [] as ProposalType[]
  };

  if (!proposalsRecord.value) return initialValue;

  return proposalsRecord.value.proposals.reduce((v, proposal) => {
    if (proposal.has_ended) v.ended.push(proposal);
    else v.active.push(proposal);

    return v;
  }, initialValue);
});
</script>

<template>
  <div>
    <div class="relative bg-skin-border h-[140px] -mb-[70px]">
      <div class="absolute right-4 top-4 space-x-2">
        <router-link :to="{ name: 'editor' }">
          <UiButton class="!px-0 w-[46px]">
            <IH-plus-sm class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <div class="px-4">
      <div class="mb-4 relative">
        <router-link :to="{ name: 'overview' }">
          <Stamp
            :id="space.id"
            :size="90"
            class="mb-2 border-[4px] border-skin-bg !bg-skin-bg !rounded-lg"
          />
        </router-link>
        <h1 v-text="space.name" />
        <div class="mb-3">
          <b class="text-skin-link">{{ space.proposal_count }}</b> proposals ·
          <b class="text-skin-link">{{ space.vote_count }}</b> votes
        </div>
        <div class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </div>
        <div class="space-x-2">
          <img src="~@/assets/twitter.svg" class="w-[28px] h-[28px] inline-block" />
          <img src="~@/assets/discord.svg" class="w-[28px] h-[28px] inline-block" />
          <img src="~@/assets/github.svg" class="w-[28px] h-[28px] inline-block" />
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
          name: 'proposals',
          linkTitle: 'See more'
        }"
      />
      <ProposalsList
        title="Closed proposals"
        :loading="!proposalsRecord?.summaryLoaded"
        :limit="PROPOSALS_LIMIT - 1"
        :proposals="grouped.ended"
        :route="{
          name: 'proposals',
          linkTitle: 'See more'
        }"
        class="mt-4"
      />
    </div>
  </div>
</template>
