<script setup lang="ts">
import { Proposal } from '@/types';

defineProps<{
  open: boolean;
  proposal: Proposal;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Timeline'" />
    </template>
    <div class="p-4">
      <ProposalTimeline :data="proposal" />
    </div>
  </UiModal>
</template>
