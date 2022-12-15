<script setup lang="ts">
import { Ref, ref, toRefs, watch } from 'vue';
import { currentNetwork } from '@/networks';
import { shortenAddress } from '@/helpers/utils';
import choices from '@/helpers/choices.json';
import type { Proposal as ProposalType, Vote } from '@/types';

const props = defineProps<{
  open: boolean;
  proposal: ProposalType;
}>();

defineEmits<{
  (e: 'close');
}>();

const votes: Ref<Vote[]> = ref([]);
const loaded = ref(false);
const { open } = toRefs(props);

watch(open, async () => {
  if (open.value === false) return;
  console.log('Get votes');
  votes.value = await currentNetwork.api.loadProposalVotes(props.proposal);
  loaded.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Votes'" />
    </template>
    <UiLoading v-if="!loaded" class="p-4 block text-center" />
    <div v-else>
      <div v-if="votes.length > 0">
        <div
          v-for="(vote, i) in votes"
          :key="i"
          class="py-3 px-4 border-b last:border-b-0 relative"
        >
          <div
            class="absolute choice-bg top-0 bottom-0 right-0 opacity-10"
            :style="{
              width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
            }"
            :class="`_${vote.choice}`"
          />
          <Stamp :id="vote.voter.id" :size="24" class="mr-2" />
          <router-link
            :to="{ name: 'user', params: { id: vote.voter.id } }"
            @click="$emit('close')"
          >
            {{ shortenAddress(vote.voter.id) }}
          </router-link>
          <div class="absolute right-4 top-3 text-skin-link" v-text="choices[vote.choice]" />
        </div>
      </div>
      <div v-else class="p-4 text-center">There isn't any votes yet!</div>
    </div>
  </UiModal>
</template>
