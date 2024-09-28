<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { SpaceMetadataLabel } from '@/types';

const props = defineProps<{
  editMode: boolean;
  initialState?: SpaceMetadataLabel;
}>();

const emit = defineEmits<{
  (e: 'editLabel', id: string | null): void;
  (e: 'deleteLabel', id: string): void;
  (e: 'submit', label: SpaceMetadataLabel): void;
}>();

const form = ref(
  props.initialState ? clone(props.initialState) : clone(generateDefaultState())
);

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Space',
    additionalProperties: false,
    required: ['name', 'color'],
    properties: {
      name: {
        type: 'string',
        title: 'Label name',
        minLength: 1,
        maxLength: 32,
        examples: ['council']
      },
      description: {
        type: 'string',
        title: 'Description',
        maxLength: 100,
        examples: ['Explain about label']
      },
      color: {
        type: 'string',
        format: 'color',
        title: 'Color'
      }
    }
  };
});

const formErrors = computed(() =>
  validateForm(definition.value, form.value, { skipEmptyOptionalFields: true })
);

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});
const textColor = computed(() => {
  return isColorLight(form.value.color) ? '#000000' : '#FFFFFF';
});

watch([() => props.initialState, () => props.editMode], () => {
  form.value = clone(props.initialState || generateDefaultState());
});

function generateDefaultState(): SpaceMetadataLabel {
  return {
    id: crypto.randomUUID().substring(0, 8),
    name: '',
    description: '',
    color: ''
  };
}

function handleCancel() {
  emit('editLabel', null);
}

function handleSubmit() {
  emit('submit', form.value);
}

function isColorLight(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}
</script>

<template>
  <div>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
      :class="{
        'border-b-0 rounded-b-none bg-skin-input-bg': editMode
      }"
    >
      <div class="flex items-center">
        <div
          class="p-2 mr-4 border rounded-full leading-3"
          :style="{ backgroundColor: form.color, color: textColor }"
        >
          {{ form.name || 'Label preview' }}
        </div>
        <div class="flex min-w-0">
          <div class="truncate mr-3">
            {{ form.description || 'This is a description preview' }}
          </div>
        </div>
      </div>
      <div class="flex gap-3">
        <button
          v-if="!editMode"
          type="button"
          @click="emit('editLabel', form.id)"
        >
          <IH-pencil />
        </button>
        <button
          v-if="initialState"
          type="button"
          @click="emit('deleteLabel', form.id)"
        >
          <IH-trash />
        </button>
      </div>
    </div>
    <div v-if="editMode" class="rounded-b-lg border s-box p-3">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
      />
      <div class="flex gap-2">
        <UiButton class="w-full" @click="handleCancel">Cancel</UiButton>
        <UiButton
          class="w-full primary"
          :disabled="!formValid"
          @click="handleSubmit"
          >{{ initialState ? 'Confirm' : 'Create label' }}</UiButton
        >
      </div>
    </div>
  </div>
</template>
