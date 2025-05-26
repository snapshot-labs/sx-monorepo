<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const props = defineProps<{ open: boolean; initialState?: { name: string; description: string } }>();
const emit = defineEmits<{ (e: 'add', config: { name: string; description: string }); (e: 'close'): void }>();

const form = ref(props.initialState ? clone(props.initialState) : { name: '', description: '' });

const definition = {
  type: 'object',
  title: 'Category',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      title: 'Category name',
      minLength: 1,
      maxLength: 32,
      examples: ['announcements']
    },
    description: {
      type: 'string',
      title: 'Description',
      maxLength: 100,
      examples: ['Explain about category']
    }
  }
};

const formErrors = computed(() => {
  const validator = getValidator(definition);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => Object.keys(formErrors.value).length === 0);

function handleSubmit() {
  emit('add', form.value);
}

watch(
  () => props.open,
  () => {
    form.value = clone(props.initialState || { name: '', description: '' });
  }
);
</script>
<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="initialState ? 'Edit category' : 'Add category'" />
    </template>
    <div class="s-box p-4">
      <UiForm :model-value="form" :error="formErrors" :definition="definition" />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">Confirm</UiButton>
    </template>
  </UiModal>
</template>
