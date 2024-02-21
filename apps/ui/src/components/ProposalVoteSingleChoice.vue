<script setup lang="ts">
import { Choice, Proposal } from '@/types';

defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
}>();

const emit = defineEmits<{
  (e: 'handleVoteClick', value: number);
}>();
</script>

<template>
  <UiButton
    v-for="(choice, index) in proposal.choices"
    :key="index"
    class="!h-[48px] text-left w-full truncate"
    :loading="sendingType === index + 1"
    @click="emit('handleVoteClick', index + 1)"
  >
    {{ choice }}
  </UiButton>
</template>
