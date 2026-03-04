<script setup lang="ts">
import { SpaceMetadataLabel } from '@/types';

defineProps<{
  labels: SpaceMetadataLabel[];
  buttonProps?: Record<string, any>;
  panelProps?: Record<string, any>;
}>();

defineSlots<{
  button(props: { close: () => void }): any;
}>();

const selectedLabels = defineModel<string[]>({
  required: true
});
</script>

<template>
  <UiPickerMultiple
    v-model="selectedLabels"
    :items="labels"
    :search-keys="['name', 'description']"
    :button-props="buttonProps"
    :panel-props="panelProps"
  >
    <template #button="{ close }">
      <slot name="button" :close="close">
        <IH-pencil />
      </slot>
    </template>
    <template #item="{ item }">
      <div class="w-11/12">
        <UiProposalLabel
          :label="item.name || 'label preview'"
          :color="(item as SpaceMetadataLabel).color"
        />
        <div
          v-if="(item as SpaceMetadataLabel).description"
          class="mt-2 truncate leading-[18px] text-sm"
          v-text="(item as SpaceMetadataLabel).description"
        />
      </div>
    </template>
  </UiPickerMultiple>
</template>
