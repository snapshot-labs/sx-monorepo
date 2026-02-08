<script setup lang="ts">
import { validateForm } from '@/helpers/validation';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'start', address: string): void;
}>();

const definition = {
  type: 'object',
  title: 'New message',
  additionalProperties: false,
  required: ['address'],
  properties: {
    address: {
      type: 'string',
      format: 'address',
      title: 'Address',
      examples: ['0x...'],
      showControls: false
    }
  }
};

const form = reactive({ address: '' });

const formErrors = computed(() => validateForm(definition, form));

function handleSubmit() {
  emit('start', form.address.toLowerCase());
  emit('close');
}

watch(
  () => props.open,
  () => {
    form.address = '';
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>New message</h3>
    </template>
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
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
