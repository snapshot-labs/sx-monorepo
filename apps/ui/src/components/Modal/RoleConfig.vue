<script setup lang="ts">
import { RoleConfig } from '@/helpers/townhall/types';
import { clone, getRandomHexColor } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const props = defineProps<{
  open: boolean;
  loading?: boolean;
  initialState?: RoleConfig;
}>();

const emit = defineEmits<{
  (e: 'add', config: RoleConfig);
  (e: 'close'): void;
}>();

const form = ref(
  props.initialState ? clone(props.initialState) : clone(generateDefaultState())
);

const definition = computed(() => ({
  type: 'object',
  title: 'Role',
  additionalProperties: false,
  required: ['name', 'color'],
  properties: {
    name: {
      type: 'string',
      title: 'Role name',
      minLength: 1,
      maxLength: 32,
      examples: ['council']
    },
    description: {
      type: 'string',
      title: 'Description',
      maxLength: 100,
      examples: ['Role description']
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

function generateDefaultState(): RoleConfig {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    color: getRandomHexColor(),
    isAdmin: false
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
      <h3 v-text="initialState ? 'Edit role' : 'Add role'" />
    </template>
    <div class="flex items-center max-w-md gap-3 pt-4 px-4">
      <div
        class="md:min-w-max min-w-0 flex-shrink-0 items-center flex space-x-2"
      >
        <div
          class="size-[10px] rounded-full"
          :style="{ background: form.color }"
        />
        <h4 v-text="form.name || 'Preview'" />
      </div>
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
      <div class="mt-3">
        <UiSwitch v-model="form.isAdmin" title="Administrator role" />
      </div>
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
