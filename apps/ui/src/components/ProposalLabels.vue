<script setup lang="ts">
import { SpaceMetadataLabel } from '@/types';

const props = withDefaults(
  defineProps<{
    spaceId: string;
    labels: string[];
    spaceLabels?: SpaceMetadataLabel[];
    inline?: boolean;
    withLink?: boolean;
  }>(),
  {
    inline: false,
    withLink: false
  }
);

const validLabels = computed(() => {
  if (!props.spaceLabels?.length || !props.labels?.length) return [];

  return props.labels
    .map(label => props.spaceLabels?.find(l => l.id === label))
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
      :to="
        withLink
          ? {
              name: 'space-proposals',
              params: { space: spaceId },
              query: { labels: label.id }
            }
          : undefined
      "
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
        <UiProposalLabel
          :label="label.name"
          :color="label.color"
          :to="
            withLink
              ? {
                  name: 'space-proposals',
                  params: { space: spaceId },
                  query: { labels: label.id }
                }
              : undefined
          "
        />
      </UiTooltip>
    </li>
  </ul>
  <div v-else>No labels yet</div>
</template>
