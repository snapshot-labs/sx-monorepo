<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { ChainId } from '@/types';

const model = defineModel<string>();

const props = defineProps<{
  title: string;
  description?: string;
  chainId: ChainId;
}>();

const emit = defineEmits<{
  (e: 'errors', value: any): void;
}>();

const definition = computed(() => ({
  type: 'string',
  format: 'address',
  chainId: props.chainId,
  title: 'Space controller',
  examples: ['0x0000…'],
  showControls: false
}));

const formErrors = computed(() =>
  validateForm(
    {
      type: 'object',
      title: 'Space',
      additionalProperties: false,
      required: ['controller'],
      properties: {
        controller: definition.value
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
  <UiContainerSettings :title="title" :description="description">
    <div class="s-box">
      <UiInputAddress
        v-model="model"
        :error="formErrors.controller"
        :definition="definition"
        :required="true"
      />
    </div>
  </UiContainerSettings>
</template>
