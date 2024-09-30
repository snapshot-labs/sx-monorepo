<script setup lang="ts">
import { SpaceMetadataLabel } from '@/types';

const labels = defineModel<SpaceMetadataLabel[]>({
  required: true
});

const { addNotification } = useUiStore();
const newLabelFormVisible = ref(false);
const editLabelId = ref<string | null>(null);

function initiateLabelCreation() {
  if (labels.value.length >= 10) {
    return addNotification('error', 'Cannot add more than 10 labels');
  }

  newLabelFormVisible.value = true;
  editLabelId.value = null;
}

function checkLabelExists(newLabel) {
  return labels.value
    .filter(label => label.id !== newLabel.id)
    .some(label => label.name.toLowerCase() === newLabel.name.toLowerCase());
}

function handleSubmit(labelData) {
  const { id } = labelData;

  if (checkLabelExists(labelData)) {
    return addNotification('error', 'Label with this name already exists');
  }

  const existingLabelIndex = labels.value.findIndex(label => label.id === id);
  labels.value =
    existingLabelIndex === -1
      ? [labelData, ...labels.value]
      : labels.value.map(label => (label.id === id ? labelData : label));

  setActiveEditLabel(null);
}

function setActiveEditLabel(id) {
  newLabelFormVisible.value = false;
  editLabelId.value = id;
}

function handleDeleteLabel(id) {
  labels.value = labels.value.filter(label => label.id !== id);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UiButton
      class="w-full"
      :disabled="newLabelFormVisible || !!editLabelId"
      @click="initiateLabelCreation"
    >
      Add label
    </UiButton>
    <FormSpaceLabel
      v-if="newLabelFormVisible"
      @toggle-edit-mode="setActiveEditLabel"
      @submit="handleSubmit"
    />
    <div v-for="(label, i) in labels" :key="i">
      <FormSpaceLabel
        :open="editLabelId === label.id"
        :initial-state="label"
        @toggle-edit-mode="setActiveEditLabel"
        @delete-label="handleDeleteLabel"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
