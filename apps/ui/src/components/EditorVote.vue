<script setup lang="ts">
import Draggable from 'vuedraggable';
import { CHOICES, SUPPORTED_VOTING_TYPES } from '@/helpers/constants';
import { Draft, VoteType } from '@/types';

const proposal = defineModel<Draft>({ required: true });

const VOTE_TYPES = {
  basic: {
    label: 'Basic voting',
    description: 'Single choice voting with three choices: For, Against or Abstain'
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

  proposal.value.type = type;

  if (proposal.value.type === 'basic') {
    proposal.value.choices = [...CHOICES];
  }
}
</script>

<template>
  <div class="s-base mb-4">
    <h4 class="eyebrow mb-2">Voting type</h4>
    <div class="flex flex-col space-y-2 mb-4">
      <div
        v-for="(type, index) in SUPPORTED_VOTING_TYPES as VoteType[]"
        :key="index"
        class="border rounded-lg p-[12px] flex gap-4 cursor-pointer"
        :class="{ 'border-[#111111] bg-[#FBFBFB]': proposal.type === type }"
        @click="handleVoteTypeSelected(type)"
      >
        <div class="h-[82px] w-[122px] block rounded-lg shrink-0 bg-[#EDEDED]"></div>
        <div class="grow">
          {{ VOTE_TYPES[type].label }}
          <div>
            {{ VOTE_TYPES[type].description }}
          </div>
        </div>
        <div class="w-[36px]">
          <IH-check v-if="proposal.type === type" />
        </div>
      </div>
    </div>

    <h4 class="eyebrow mb-2">Choices</h4>
    <div class="flex flex-col gap-2">
      <Draggable v-model="proposal.choices" handle=".handle" class="flex flex-col gap-2">
        <template #item="{ index: index }">
          <div class="flex border items-center rounded-lg bg-[#FBFBFB] h-[40px]">
            <div class="handle ml-3 text-skin-link cursor-pointer opacity-50 hover:opacity-100">
              <IH-switch-vertical />
            </div>
            <div class="grow">
              <input
                v-model.trim="proposal.choices[index]"
                type="text"
                class="w-full rounded-lg h-[40px] p-1 px-3 bg-transparent"
                :class="{ '!cursor-not-allowed': proposal.type === 'basic' }"
                placeholder="(optional)"
                :disabled="proposal.type === 'basic'"
              />
            </div>
            <UiButton
              v-if="proposal.choices.length > 1"
              class="border-0 rounded-l-none border-l bg-transparent h-[40px] w-[40px] !px-0 text-center"
              :disabled="proposal.type === 'basic'"
              @click="proposal.choices.splice(index, 1)"
            >
              <IH-trash class="inline-block" />
            </UiButton>
          </div>
        </template>
      </Draggable>
      <UiButton
        class="w-full border-dashed !rounded-lg flex items-center justify-center space-x-1"
        :disabled="proposal.type === 'basic'"
        @click="proposal.choices.push('')"
      >
        <IH-plus-sm />
        <span>New choice</span>
      </UiButton>
    </div>
  </div>
</template>
