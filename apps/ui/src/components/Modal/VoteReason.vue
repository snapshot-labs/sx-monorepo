<script setup lang="ts">
import { autoLinkText } from '@/helpers/utils';
import { Vote } from '@/types';

defineProps<{
  open: boolean;
  vote: Vote | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Reason'" />
    </template>
    <div
      class="p-4 whitespace-pre-line text-skin-link"
      v-html="autoLinkText(vote?.reason || '')"
    />
  </UiModal>
</template>
