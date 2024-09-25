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
      class="vote-reason p-4 whitespace-pre-line text-skin-link break-words"
      v-html="autoLinkText(vote?.reason || '')"
    />
  </UiModal>
</template>

<style class="scss" scoped>
.vote-reason:deep() a {
  text-decoration: underline;
}
</style>
