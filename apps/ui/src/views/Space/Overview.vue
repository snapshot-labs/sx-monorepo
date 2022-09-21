<script setup lang="ts">
import { onMounted, ref, Ref } from 'vue';
import apollo from '@/helpers/apollo';
import { PROPOSALS_QUERY } from '@/helpers/queries';
import { Space, Proposal as ProposalType } from '@/types';

const props = defineProps<{ space: Space }>();

const proposals: Ref<ProposalType[]> = ref([]);
const loaded: Ref<boolean> = ref(false);

onMounted(async () => {
  const { data } = await apollo.query({
    query: PROPOSALS_QUERY,
    variables: {
      first: 5,
      space: props.space.id
    }
  });
  proposals.value = data.proposals;
  loaded.value = true;
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
            class="mb-2 border-[4px] border-skin-bg !bg-skin-bg rounded-lg"
          />
        </router-link>
        <h1 v-text="space.name" />
        <div class="mb-3">
          <b class="text-skin-link">{{ space.proposal_count }}</b> proposals ·
          <b class="text-skin-link">{{ space.vote_count }}</b> votes
        </div>
        <div class="max-w-[540px] text-skin-link text-md leading-[26px]">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </div>
      </div>
    </div>
    <div>
      <Label :label="'Active proposals'" />
      <UiLoading v-if="!loaded" class="block px-4 py-3" />
      <div v-else>
        <Proposal
          v-for="(proposal, i) in proposals"
          :key="i"
          :proposal="proposal"
        />
        <div v-if="!proposals.length" class="px-4 py-3 text-skin-link">
          <IH-exclamation-circle class="inline-block mr-2" />
          <span v-text="'There are no proposals here.'" />
        </div>
        <router-link v-else :to="{ name: 'proposals' }" class="px-4 py-2 block">
          See more
        </router-link>
      </div>
    </div>
  </div>
</template>
