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
  if (currentType === 'basic' || previousType === 'basic') {
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
    <UiEyebrow class="mb-2.5">Voting system</UiEyebrow>
    <button
      type="button"
      class="border rounded-xl py-2.5 px-3 flex text-left relative border-skin-content w-full"
      :class="{
        '!border-skin-border cursor-not-allowed': !hasMultipleVotingType
      }"
      :disabled="!hasMultipleVotingType"
      @click="handleVotingTypeClick"
    >
      <div>
        <h4 class="text-skin-link inline" v-text="activeVotingType.label" />
        <UiPillCounter v-if="activeVotingType.isBeta" class="ml-2 py-0.5">
          beta
        </UiPillCounter>
      </div>
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
