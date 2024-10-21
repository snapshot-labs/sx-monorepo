<script setup lang="ts">
import { Space } from '@/types';

defineProps<{
  space: Space;
}>();

const labels = defineModel<string[]>({
  default: []
});
</script>

<template>
  <div v-if="space.labels?.length">
    <div class="flex justify-between mb-2.5">
      <h4 class="eyebrow" v-text="'Labels'" />
      <PickerLabel v-model="labels" :labels="space.labels" />
    </div>
    <ProposalLabels :labels="labels" :space="space" />
  </div>
</template>
