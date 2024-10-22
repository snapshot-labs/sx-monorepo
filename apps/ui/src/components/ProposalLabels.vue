<script setup lang="ts">
import { Space } from '@/types';

const props = withDefaults(
  defineProps<{
    space: Space;
    labels: string[];
    inline?: boolean;
  }>(),
  {
    inline: false
  }
);

const validLabels = computed(() => {
  if (!props.space.labels?.length || !props.labels?.length) return [];

  return props.labels
    .map(label => props.space.labels?.find(l => l.id === label))
    .filter(l => l !== undefined);
});
</script>
<template>
  <div v-if="inline" class="inline space-y-1">
    <UiProposalLabel
      v-for="label in validLabels"
      :key="label.id"
      :label="label.name"
      :color="label.color"
      v-bind="$attrs"
      class="inline-flex !max-w-[160px] mr-1 last:mr-0"
    />
  </div>
  <ul
    v-else-if="validLabels.length"
    class="flex flex-wrap gap-1"
    v-bind="$attrs"
  >
    <li v-for="label in validLabels" :key="label.id">
      <UiTooltip :title="label.description" class="inline">
        <UiProposalLabel :label="label.name" :color="label.color" />
      </UiTooltip>
    </li>
  </ul>
  <div v-else>No labels yet</div>
</template>
