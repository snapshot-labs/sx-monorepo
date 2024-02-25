<script setup lang="ts">
import { BASIC_CHOICES } from '@/helpers/constants';
import { Draft, VoteType } from '@/types';

const proposal = defineModel<Draft>({ required: true });

defineProps<{
  votingTypes: VoteType[];
}>();

const VOTING_TYPES_INFO = {
  basic: {
    label: 'Basic voting',
    description: 'Single choice voting with three choices: For, Against or Abstain.'
  },
  'single-choice': {
    label: 'Single choice voting',
    description: 'Each voter may select only one choice.'
  },
  approval: {
    label: 'Approval voting',
    description: 'Each voter may select any number of choices.'
  }
};

function handleVoteTypeSelected(type: VoteType) {
  if (!proposal.value) return;

  if (proposal.value.type === 'basic') {
    proposal.value.choices = Array(3).fill('');
  }

  proposal.value.type = type;

  if (type === 'basic') {
    proposal.value.choices = [...BASIC_CHOICES];
  }
}
</script>

<template>
  <template v-if="votingTypes.length > 1 || votingTypes[0] !== 'basic'">
    <div class="s-base mb-5">
      <h4 class="eyebrow mb-2.5">Voting type</h4>
      <div class="flex flex-col gap-[12px]">
        <UiSelector
          v-for="(type, index) in votingTypes"
          :key="index"
          :is-active="proposal.type === type"
          @click="handleVoteTypeSelected(type as VoteType)"
        >
          <div
            class="h-[82px] w-[122px] hidden sm:block rounded-lg shrink-0 bg-skin-active-bg"
          ></div>
          <div class="grow">
            <span class="text-skin-heading">{{ VOTING_TYPES_INFO[type].label }}</span>
            <div>
              {{ VOTING_TYPES_INFO[type].description }}
            </div>
          </div>
        </UiSelector>
      </div>
    </div>
  </template>
</template>
