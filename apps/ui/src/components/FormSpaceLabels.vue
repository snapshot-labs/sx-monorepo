<script setup lang="ts">
import { SpaceMetadataLabel } from '@/types';

const labels = defineModel<SpaceMetadataLabel[]>({
  required: true
});

const { addNotification } = useUiStore();
const modalOpen = ref(false);
const activeLabelId = ref<string | null>(null);

function setModalStatus(open: boolean = false, labelId: string | null = null) {
  modalOpen.value = open;
  activeLabelId.value = labelId;
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
      ? [...labels.value, labelData]
      : labels.value.map(label => (label.id === id ? labelData : label));

  setModalStatus();
}

function handleDeleteLabel(id) {
  labels.value = labels.value.filter(label => label.id !== id);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="(label, i) in labels" :key="i">
      <div
        class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
      >
        <div class="flex items-center max-w-md gap-3">
          <UiProposalLabel
            :label="label.name || 'label preview'"
            :color="label.color"
          />
          <div class="truncate">
            {{ label.description }}
          </div>
        </div>
        <div class="flex gap-3">
          <button type="button" @click="() => setModalStatus(true, label.id)">
            <IH-pencil />
          </button>
          <button type="button" @click="() => handleDeleteLabel(label.id)">
            <IH-trash />
          </button>
        </div>
      </div>
    </div>
    <UiButton
      v-if="labels.length < 10"
      class="w-full flex items-center justify-center gap-1"
      @click="() => setModalStatus(true)"
    >
      <IH-plus class="shrink-0 size-[16px]" />
      Add label
    </UiButton>
  </div>
  <teleport to="#modal">
    <ModalLabelConfig
      :open="modalOpen"
      :initial-state="labels.find(l => l.id === activeLabelId)"
      @close="setModalStatus"
      @add="handleSubmit"
    />
  </teleport>
</template>
