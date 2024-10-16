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
    <div v-for="label in validLabels" :key="label.id" class="inline-flex mr-2">
      <UiProposalLabel
        :label="label.name"
        :color="label.color"
        class="text-sm mb-1 max-w-[160px]"
      />
    </div>
  </template>
  <div v-else>
    <h4 v-if="viewOnly" class="eyebrow mb-3" v-text="'Labels'" />
    <PickerLabel v-else v-model="labels" :labels="spaceLabels" />
    <div v-if="validLabels.length" class="flex flex-wrap">
      <div v-for="label in validLabels" :key="label.id" class="mr-2 mb-2">
        <UiTooltip :title="label.description" class="inline">
          <UiProposalLabel :label="label.name" :color="label.color" />
        </UiTooltip>
      </div>
    </div>
    <div v-else class="mt-1">No labels yet</div>
  </div>
</template>
