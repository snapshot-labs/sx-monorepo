<script setup lang="ts">
import { validateForm } from '@/helpers/validation';

const model = defineModel<string>({ required: true });

const emit = defineEmits<{
  (e: 'errors', value: any);
}>();

const definition = {
  type: 'string',
  format: 'address',
  title: 'Space controller',
  examples: ['0x0000…']
};

const formErrors = computed(() =>
  validateForm(
    {
      type: 'object',
      title: 'Space',
      additionalProperties: false,
      required: ['controller'],
      properties: {
        controller: definition
      }
    },
    {
      controller: model.value
    }
  )
);

watch(formErrors, value => emit('errors', value));
</script>

<template>
  <h3>Controller</h3>
  <div class="s-box pt-4">
    <SIString
      :model-value="model"
      :error="formErrors.controller"
      :definition="definition"
      @update:model-value="v => (model = v)"
    />
  </div>
</template>
