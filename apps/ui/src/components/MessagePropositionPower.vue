<script setup lang="ts">
import { PropositionPowerItem } from '@/queries/propositionPower';

defineProps<{
  propositionPower?: PropositionPowerItem;
  isError: boolean;
}>();

defineEmits<{
  (e: 'fetch');
}>();
</script>

<template>
  <div
    v-if="isError || !propositionPower"
    class="flex flex-col gap-3 items-start"
    v-bind="$attrs"
  >
    <UiAlert type="error">
      There was an error fetching your proposition power.
    </UiAlert>
    <UiButton
      type="button"
      class="flex items-center gap-2"
      @click="$emit('fetch')"
    >
      <IH-refresh />Retry
    </UiButton>
  </div>
  <div v-bind="$attrs" class="flex border border-skin-danger/40 rounded-lg">
    <div class="p-[14px] bg-skin-danger-active text-skin-danger shrink-0">
      <IH-exclamation-circle />
    </div>
    <div class="px-3 py-2.5 leading-[22px]">
      You do not have enough proposition power to create proposal in this space.
    </div>
  </div>
</template>
