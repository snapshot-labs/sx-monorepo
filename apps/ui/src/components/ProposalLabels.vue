<script setup lang="ts">
import { Space } from '@/types';

const props = withDefaults(
  defineProps<{
    space: Space;
    proposalLabels?: string[];
    showEdit?: boolean;
    inline?: boolean;
  }>(),
  {
    showEdit: false,
    inline: false
  }
);

const labels = defineModel<string[]>({
  default: []
});

const validLabels = computed(() => {
  if (!props.space.labels?.length) return [];

  return labels.value
    .map(label => props.space.labels.find(l => l.id === label))
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
    <AppLink
      v-for="label in validLabels"
      :key="label.id"
      :to="{ name: 'space-proposals', query: { 'labels[]': label.id } }"
    >
      <UiProposalLabel
        class="inline-flex mr-1 mb-1 !max-w-[160px]"
        :label="label.name"
        :color="label.color"
      />
    </AppLink>
  </template>
  <div v-else>
    <div class="flex justify-between mb-3">
      <h4 class="eyebrow" v-text="'Labels'" />
      <PickerLabel v-if="showEdit" v-model="labels" :labels="space.labels" />
    </div>
    <ul v-if="validLabels.length" class="flex flex-wrap gap-1">
      <li v-for="label in validLabels" :key="label.id">
        <UiProposalLabel :label="label.name" :color="label.color" />
      </li>
    </ul>
    <div v-else class="mt-1">No labels yet</div>
  </div>
</template>
