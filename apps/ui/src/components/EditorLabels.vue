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
          <UiEyebrow>Labels</UiEyebrow>
          <IH-pencil />
        </div>
      </template>
    </PickerLabel>
    <ProposalLabels
      :space-id="`${space.network}:${space.id}`"
      :space-labels="space.labels"
      :labels="labels"
    />
  </div>
</template>
