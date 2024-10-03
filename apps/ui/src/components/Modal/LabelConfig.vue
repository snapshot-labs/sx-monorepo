<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { SpaceMetadataLabel } from '@/types';

const props = defineProps<{
  open: boolean;
  initialState?: SpaceMetadataLabel;
}>();

const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataLabel);
  (e: 'close'): void;
}>();

const form = ref(
  props.initialState ? clone(props.initialState) : clone(generateDefaultState())
);

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
      title: 'Color',
      examples: ['#FF0000']
    }
  }
};

const formErrors = computed(() => {
  const validator = getValidator(definition);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

watch(
  () => props.open,
  () => {
    form.value = clone(props.initialState || generateDefaultState());
  }
);

function generateDefaultState(): SpaceMetadataLabel {
  return {
    id: crypto.randomUUID().substring(0, 8),
    name: '',
    description: '',
    color: ''
  };
}

async function handleSubmit() {
  emit('add', form.value);
}
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="initialState ? 'Edit label' : 'Add label'" />
    </template>
    <div class="flex items-center max-w-md gap-3 pt-4 px-4">
      <UiProposalLabel
        :label="form.name || 'label preview'"
        :color="form.color"
      />
      <div class="truncate">
        {{ form.description || (open ? 'This is a description preview' : '') }}
      </div>
    </div>
    <div class="s-box p-4">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
      />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
