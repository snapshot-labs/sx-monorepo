<script setup lang="ts">
import { Choice, Proposal } from '@/types';

type ApprovalChoice = number[];

const props = defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
  defaultChoice?: Choice;
}>();

const emit = defineEmits<{
  (e: 'vote', value: Choice);
}>();

const selectedChoice = ref<ApprovalChoice>(
  (!props.proposal.privacy && (props.defaultChoice as ApprovalChoice)) || []
);

function toggleSelectedChoice(choice: number) {
  if (selectedChoice.value.includes(choice)) {
    selectedChoice.value = selectedChoice.value.filter(c => c !== choice);
  } else {
    selectedChoice.value = [...selectedChoice.value, choice];
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
        :class="{ 'border-skin-text': selectedChoice.includes(index + 1) }"
        @click="toggleSelectedChoice(index + 1)"
      >
        <div class="grow truncate">
          {{ choice }}
        </div>
        <IH-check v-if="selectedChoice.includes(index + 1)" class="shrink-0" />
      </UiButton>
    </div>
    <UiButton
      primary
      class="!h-[48px] w-full"
      :loading="!!sendingType"
      @click="emit('vote', selectedChoice)"
    >
      Vote
    </UiButton>
  </div>
</template>
