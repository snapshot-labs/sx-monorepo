<script setup lang="ts">
import { BASIC_CHOICES } from '@/helpers/constants';
import { Draft, VoteType } from '@/types';

const proposal = defineModel<Draft>({ required: true });

defineProps<{
  votingTypes: VoteType[];
}>();

const VOTING_TYPES_INFO = computed(() => ({
  basic: {
    label: 'Basic voting',
    description: 'Voters have three choices: they can vote "For", "Against" or "Abstain".'
  },
  'single-choice': {
    label: 'Single choice voting',
    description: 'Voters can select only one choice from a predefined list.'
  },
  approval: {
    label: 'Approval voting',
    description: 'Voters can select multiple choices, each choice receiving full voting power.'
  },
  'ranked-choice': {
    label: 'Ranked choice voting',
    description:
      'Each voter may select and rank any number of choices. Results are calculated by instant-runoff counting method.'
  },
  weighted: {
    label: 'Weighted voting',
    description: 'Each voter may spread voting power across any number of choices.'
  },
  quadratic: {
    label: 'Quadratic voting',
    description:
      'Each voter may spread voting power across any number of choices. Results are calculated quadratically.'
  }
}));

function handleVoteTypeSelected(type: VoteType) {
  if (!proposal.value) return;

  if (proposal.value.type === 'basic') {
    proposal.value.choices = Array(2).fill('');
  }

  proposal.value.type = type;

  if (type === 'basic') {
    proposal.value.choices = [...BASIC_CHOICES];
  }
}
</script>

<template>
  <div class="s-base mb-4">
    <h4 class="eyebrow mb-2.5">Voting type</h4>
    <div class="flex flex-col gap-[12px]">
      <UiSelector
        v-for="(type, index) in votingTypes"
        :key="index"
        :is-active="proposal.type === type"
        @click="handleVoteTypeSelected(type as VoteType)"
      >
        <div>
          <h4 class="text-skin-link" v-text="VOTING_TYPES_INFO[type].label" />
          <div v-text="VOTING_TYPES_INFO[type].description" />
        </div>
      </UiSelector>
    </div>
  </div>
</template>
