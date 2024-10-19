<script setup lang="ts">
import { SpaceMetadataLabel } from '@/types';

const props = withDefaults(
  defineProps<{
    spaceLabels: SpaceMetadataLabel[];
    proposalLabels?: string[];
    viewOnly?: boolean;
    inline?: boolean;
  }>(),
  {
    viewOnly: true,
    inline: false
  }
);

const labels = defineModel<string[]>({
  default: []
});

const validLabels = computed(() => {
  return labels.value
    .map(label => props.spaceLabels.find(l => l.id === label))
    .filter(l => l !== undefined);
});

watch(
  () => props.proposalLabels,
  () => {
    if (props.proposalLabels) {
      labels.value = props.proposalLabels;
    }
  },
  { immediate: true }
);
</script>
<template>
  <template v-if="inline">
    <UiProposalLabel
      v-for="label in validLabels"
      :key="label.id"
      class="inline-flex mr-1 mb-1 !max-w-[160px]"
      :label="label.name"
      :color="label.color"
    />
  </template>
  <div v-else>
    <div class="flex justify-between mb-2.5">
      <h4 v-if="viewOnly" class="eyebrow" v-text="'Labels'" />
      <PickerLabel v-else v-model="labels" :labels="spaceLabels" />
    </div>
    <ul v-if="validLabels.length" class="flex flex-wrap gap-1">
      <li v-for="label in validLabels" :key="label.id">
        <UiTooltip :title="label.description" class="inline">
          <UiProposalLabel :label="label.name" :color="label.color" />
        </UiTooltip>
      </li>
    </ul>
    <div v-else class="mt-1">No labels yet</div>
  </div>
</template>
