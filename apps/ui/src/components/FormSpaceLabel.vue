<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { SpaceMetadataLabel } from '@/types';

const props = withDefaults(
  defineProps<{
    open?: boolean;
    initialState?: SpaceMetadataLabel;
  }>(),
  {
    open: true
  }
);

const emit = defineEmits<{
  (e: 'toggleEditMode', id: string | null): void;
  (e: 'deleteLabel', id: string): void;
  (e: 'submit', label: SpaceMetadataLabel): void;
}>();

const definition = {
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

const form = ref(
  props.initialState ? clone(props.initialState) : clone(generateDefaultState())
);

const formErrors = computed(() =>
  validateForm(definition, form.value, { skipEmptyOptionalFields: true })
);

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

function generateDefaultState(): SpaceMetadataLabel {
  return {
    id: crypto.randomUUID().substring(0, 8),
    name: '',
    description: '',
    color: ''
  };
}

watch([() => props.initialState, () => props.open], () => {
  form.value = clone(props.initialState || generateDefaultState());
});
</script>

<template>
  <div>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
      :class="{
        'border-b-0 rounded-b-none bg-skin-input-bg': open
      }"
    >
      <div class="flex items-center max-w-md gap-3">
        <UiProposalLabel
          :label="form.name || 'label preview'"
          :color="form.color"
        />
        <div class="truncate">
          {{
            form.description || (open ? 'This is a description preview' : '')
          }}
        </div>
      </div>
      <div class="flex gap-3">
        <button
          v-if="!open"
          type="button"
          @click="emit('toggleEditMode', form.id)"
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
    <div v-if="open" class="rounded-b-lg border s-box p-3">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
      />
      <div class="flex gap-2">
        <UiButton class="w-full" @click="$emit('toggleEditMode', null)"
          >Cancel</UiButton
        >
        <UiButton
          class="w-full primary"
          :disabled="!formValid"
          @click="emit('submit', form)"
          >{{ initialState ? 'Confirm' : 'Create label' }}</UiButton
        >
      </div>
    </div>
  </div>
</template>
