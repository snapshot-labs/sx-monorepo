<script setup lang="ts">
import type { Choice, Proposal } from '@/types';

type ApprovalChoice = number[];

const props = defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
  choices?: Choice;
}>();

const emit = defineEmits<{
  (e: 'vote', value: Choice);
}>();

const selectedChoices = ref<ApprovalChoice>((props.choices as ApprovalChoice) || []);

function toggleSelectedChoice(choice: number) {
  if (selectedChoices.value.includes(choice)) {
    selectedChoices.value = selectedChoices.value.filter(c => c !== choice);
  } else {
    selectedChoices.value = [...selectedChoices.value, choice];
  }
}
</script>

<template>
  <div class="flex flex-col space-y-3">
    <div class="flex flex-col space-y-2">
      <UiButton
        v-for="(choice, index) in proposal.choices"
        :key="index"
        class="!h-[48px] text-left w-full flex items-center"
        :class="{ 'border-skin-text': selectedChoices.includes(index + 1) }"
        @click="toggleSelectedChoice(index + 1)"
      >
        <div class="grow truncate">
          {{ choice }}
        </div>
        <IH-check v-if="selectedChoices.includes(index + 1)" class="shrink-0" />
      </UiButton>
    </div>
    <UiButton
      primary
      class="!h-[48px] w-full"
      :loading="!!sendingType"
      @click="emit('vote', selectedChoices)"
    >
      Vote
    </UiButton>
  </div>
</template>
