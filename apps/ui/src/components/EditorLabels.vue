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
    <PickerLabel
      v-model="labels"
      :labels="space.labels"
      :button-props="{ class: 'outline-none focus-within:text-skin-link' }"
    >
      <template #button>
        <div class="flex justify-between items-center mb-2.5">
          <h4 class="eyebrow" v-text="'Labels'" />
          <IH-pencil />
        </div>
      </template>
    </PickerLabel>
    <ProposalLabels :labels="labels" :space="space" />
  </div>
</template>
