<script setup lang="ts">
import { Choice, Proposal } from '@/types';

defineProps<{
  sendingType: Choice | number | number[] | null;
  proposal: Proposal;
}>();

const emit = defineEmits<{
  (e: 'handleVoteClick', value: number[]);
}>();

const selectedChoices = ref<number[]>([]);

function toggleSelectedChoice(choice: number) {
  if (selectedChoices.value.includes(choice)) {
    selectedChoices.value = selectedChoices.value.filter(c => c !== choice);
  } else {
    selectedChoices.value = [...selectedChoices.value, choice];
  }
}
</script>

<template>
  <div class="flex flex-col space-y-2">
    <UiButton
      v-for="(choice, index) in proposal.choices"
      :key="index"
      class="!h-[48px] text-left w-full flex align-middle"
      :class="{ 'border-skin-text': selectedChoices.includes(index + 1) }"
      @click="toggleSelectedChoice(index + 1)"
    >
      <div class="flex-grow leading-[46px] !h-[48px] truncate">
        {{ choice }}
      </div>
      <IH-check
        v-if="selectedChoices.includes(index + 1)"
        class="leading-[48px] !h-[46px] shrink-0"
      />
    </UiButton>
  </div>
  <UiButton
    primary
    class="!h-[48px] w-full"
    :loading="!!sendingType"
    @click="emit('handleVoteClick', selectedChoices)"
  >
    Vote
  </UiButton>
</template>
