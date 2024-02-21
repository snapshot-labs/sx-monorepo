<script setup lang="ts">
import { Choice, Proposal } from '@/types';

defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
}>();

const emit = defineEmits<{
  (e: 'vote', value: number);
}>();
</script>

<template>
  <div class="flex flex-col space-y-2">
    <UiButton
      v-for="(choice, index) in proposal.choices"
      :key="index"
      class="!h-[48px] text-left w-full truncate"
      :loading="sendingType === index + 1"
      @click="emit('vote', index + 1)"
    >
      {{ choice }}
    </UiButton>
  </div>
</template>
