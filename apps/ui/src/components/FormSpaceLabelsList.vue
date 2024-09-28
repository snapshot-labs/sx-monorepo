<script setup lang="ts">
import { SpaceMetadataLabel } from '@/types';

const model = defineModel<SpaceMetadataLabel[]>({
  required: true
});

const { addNotification } = useUiStore();
const showAddLabel = ref(false);
const editId = ref<string | null>(null);

function addLabel() {
  if (model.value.length >= 10) {
    return addNotification('error', 'Cannot add more than 10 labels');
  }

  showAddLabel.value = true;
  editId.value = null;
}

function handleSubmit(form) {
  if (
    model.value
      .filter(label => label.id !== form.id)
      .some(label => label.name === form.name)
  ) {
    return addNotification('error', 'Label with this name already exists');
  }

  const id = form.id;
  const existingLabel = model.value.findIndex(label => label.id === id);
  if (existingLabel === -1) {
    model.value = [form, ...model.value];
  } else {
    model.value = model.value.map(label => (label.id === id ? form : label));
  }
  editId.value = null;
  showAddLabel.value = false;
}

function handleEditForm(id) {
  showAddLabel.value = false;
  editId.value = id;
}

function handleDeleteLabel(id) {
  model.value = model.value.filter(label => label.id !== id);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UiButton class="w-full" :disabled="showAddLabel" @click="addLabel">
      Add label
    </UiButton>
    <FormSpaceLabel
      v-if="showAddLabel"
      :edit-mode="true"
      @edit-label="handleEditForm"
      @submit="handleSubmit"
    />
    <div v-for="(label, i) in model" :key="i">
      <FormSpaceLabel
        :initial-state="label"
        :edit-mode="editId === label.id"
        @edit-label="handleEditForm"
        @delete-label="handleDeleteLabel"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
