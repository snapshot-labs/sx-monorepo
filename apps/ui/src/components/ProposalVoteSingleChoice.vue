<script setup lang="ts">
import { Choice, Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
  defaultChoice?: Choice;
}>();

const emit = defineEmits<{
  (e: 'vote', value: number): void;
}>();

const selectedChoice = ref<number | null>(
  (props.proposal.privacy === 'none' && (props.defaultChoice as number)) || null
);
</script>

<template>
  <div class="flex flex-col space-y-3">
    <div class="flex flex-col space-y-2">
      <UiButton
        v-for="(choice, index) in proposal.choices"
        :key="index"
        class="text-left"
        :size="48"
        :class="{ 'border-skin-text': selectedChoice === index + 1 }"
        @click="selectedChoice = index + 1"
      >
        <UiTooltipOnTruncate :content="choice" />
        <IH-check v-if="selectedChoice === index + 1" class="shrink-0" />
      </UiButton>
    </div>
    <UiButton
      primary
      :size="48"
      :disabled="!selectedChoice"
      @click="emit('vote', selectedChoice!)"
    >
      Vote
    </UiButton>
  </div>
</template>
