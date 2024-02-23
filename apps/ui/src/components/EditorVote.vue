<script setup lang="ts">
import Draggable from 'vuedraggable';
import { CHOICES, SUPPORTED_VOTING_TYPES } from '@/helpers/constants';
import { Draft, VoteType } from '@/types';

const proposal = defineModel<Draft>({ required: true });

defineProps<{
  error?: Record<number, string>;
}>();

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
  <div class="s-base mb-5">
    <h4 class="eyebrow mb-2.5">Voting type</h4>
    <div class="flex flex-col gap-[12px]">
      <button
        v-for="(type, index) in SUPPORTED_VOTING_TYPES as VoteType[]"
        :key="index"
        class="border rounded-lg p-2.5 flex gap-3 cursor-pointer text-left"
        :class="{ 'border-[#111111] bg-[#FBFBFB]': proposal.type === type }"
        @click="handleVoteTypeSelected(type)"
      >
        <div class="h-[82px] w-[122px] block rounded-lg shrink-0 bg-[#EDEDED]"></div>
        <div class="grow">
          <span class="text-skin-heading">{{ VOTE_TYPES[type].label }}</span>
          <div>
            {{ VOTE_TYPES[type].description }}
          </div>
        </div>
        <div class="w-[20px] text-right">
          <IH-check v-if="proposal.type === type" />
        </div>
      </button>
    </div>
  </div>

  <div class="s-base">
    <h4 class="eyebrow mb-2.5">Choices</h4>
    <div class="flex flex-col gap-[10px]">
      <Draggable v-model="proposal.choices" handle=".handle" class="flex flex-col gap-[10px]">
        <template #item="{ index: index }">
          <div>
            <div
              class="flex border items-center rounded-lg bg-[#FBFBFB] h-[40px] gap-[12px] pl-2.5"
              :class="{ 'border-skin-danger': error && index === 0 }"
            >
              <div
                class="text-skin-link opacity-50"
                :class="{
                  'handle hover:opacity-100 cursor-grab': proposal.type !== 'basic',
                  'cursor-not-allowed': proposal.type === 'basic'
                }"
              >
                <IH-switch-vertical />
              </div>
              <div class="grow">
                <input
                  v-model.trim="proposal.choices[index]"
                  type="text"
                  class="w-full rounded-lg h-[40px] py-[10px] bg-transparent"
                  :class="{
                    '!cursor-not-allowed': proposal.type === 'basic'
                  }"
                  :placeholder="error && index === 0 ? 'Please type a choice' : '(optional)'"
                  :disabled="proposal.type === 'basic'"
                />
              </div>
              <UiButton
                v-if="proposal.choices.length > 1"
                class="border-0 rounded-l-none rounded-r-lg border-l bg-transparent h-[40px] w-[40px] !px-0 text-center text-skin-text"
                :disabled="proposal.type === 'basic'"
                @click="proposal.choices.splice(index, 1)"
              >
                <IH-trash class="inline-block" />
              </UiButton>
            </div>
            <span v-if="error && index === 0" class="text-skin-danger">
              {{ error[0] }}
            </span>
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
