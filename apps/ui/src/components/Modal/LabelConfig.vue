<script setup lang="ts">
import { clone, getRandomHexColor } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { SpaceMetadataLabel } from '@/types';

const props = defineProps<{
  open: boolean;
  loading?: boolean;
  initialState?: SpaceMetadataLabel;
}>();

const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataLabel): void;
  (e: 'close'): void;
}>();

const form = ref(
  props.initialState ? clone(props.initialState) : clone(generateDefaultState())
);

const definition = computed(() => ({
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
      examples: ['#FF0000'],
      showControls: true
    }
  }
}));

const formErrors = computed(() => {
  const validator = getValidator(definition.value);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

function generateDefaultState(): SpaceMetadataLabel {
  return {
    id: crypto.randomUUID().substring(0, 8),
    name: '',
    description: '',
    color: getRandomHexColor()
  };
}

function handleSubmit() {
  emit('add', form.value);
}

watch(
  () => props.open,
  () => {
    form.value = clone(props.initialState || generateDefaultState());
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="initialState ? 'Edit label' : 'Add label'" />
    </template>
    <div class="flex items-center max-w-md gap-3 pt-4 px-4">
      <UiProposalLabel
        :label="form.name || 'Label preview'"
        :color="form.color"
      />
      <div class="truncate">
        {{ form.description || 'This is a description preview' }}
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
      <UiButton
        class="w-full"
        :disabled="!formValid || loading"
        :loading="loading"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
