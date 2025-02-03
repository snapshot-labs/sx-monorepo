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
      There was an error fetching your voting power.
    </UiAlert>
    <UiButton
      type="button"
      class="flex items-center gap-2"
      @click="$emit('fetch')"
    >
      <IH-refresh />Retry
    </UiButton>
  </div>
  <UiAlert
    v-else-if="!propositionPower.canPropose"
    type="error"
    v-bind="$attrs"
  >
    You do not have enough voting power to create proposal in this space.
  </UiAlert>
</template>
