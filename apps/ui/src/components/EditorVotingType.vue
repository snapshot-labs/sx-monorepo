<script setup lang="ts">
import { BASIC_CHOICES, VOTING_TYPES_INFO } from '@/helpers/constants';
import { Draft, VoteType, VoteTypeInfo } from '@/types';

const proposal = defineModel<Draft>({ required: true });

const props = defineProps<{
  votingTypes: VoteType[];
}>();

const modalOpen = ref(false);

const activeVotingType = computed<VoteTypeInfo>(
  () => VOTING_TYPES_INFO[proposal.value.type]
);

const hasMultipleVotingType = computed<boolean>(
  () => props.votingTypes.length > 1
);

function handleVotingTypeClick() {
  modalOpen.value = true;
}

function handleVoteTypeSelected(type: VoteType) {
  if (!proposal.value) return;

  proposal.value.type = type;
}

function updateChoices(currentType: VoteType, previousType: VoteType) {
  if (previousType === 'basic') {
    proposal.value.choices = Array(2).fill('');
  }

  if (currentType) {
    proposal.value.choices = [...BASIC_CHOICES];
  }
}

watch(
  () => proposal.value.type,
  (current, previous) => {
    updateChoices(current, previous);
  }
);
</script>

<template>
  <div class="s-base">
    <h4 class="eyebrow mb-2.5">Voting system</h4>
    <button
      type="button"
      class="border rounded-xl py-2.5 px-3 flex text-left relative border-skin-content w-full"
      :class="{
        '!border-skin-border cursor-not-allowed': !hasMultipleVotingType
      }"
      :disabled="!hasMultipleVotingType"
      @click="handleVotingTypeClick"
    >
      <h4 class="text-skin-link mr-3" v-text="activeVotingType.label" />
      <div
        v-if="hasMultipleVotingType"
        class="w-[20px] text-right text-skin-link absolute right-3 top-3"
      >
        <IH-chevron-down />
      </div>
    </button>
  </div>
  <teleport to="#modal">
    <ModalSelectVotingType
      :open="modalOpen"
      :voting-types="votingTypes"
      :initial-state="proposal.type"
      @save="voteType => handleVoteTypeSelected(voteType as VoteType)"
      @close="modalOpen = false"
    />
  </teleport>
</template>
