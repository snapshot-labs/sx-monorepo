<script setup lang="ts">
import TimelineContent from '@/components/ProposalTimeline.vue';
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
      <TimelineContent :proposal="proposal" />
    </div>
  </UiModal>
</template>
