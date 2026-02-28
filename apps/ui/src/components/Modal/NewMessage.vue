<script setup lang="ts">
import { resolver } from '@/helpers/resolver';
import { getValidator } from '@/helpers/validation';

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
      format: 'ens-or-address',
      title: 'To',
      examples: ['Address or ENS'],
      showControls: false
    }
  }
};

const form = reactive({ address: '' });

const formValidated = ref(false);
const formErrors = ref({} as Record<string, any>);

const formValidator = computed(() =>
  getValidator({ $async: true, ...definition })
);

watchEffect(async () => {
  formValidated.value = false;
  formErrors.value = await formValidator.value.validateAsync(form);
  formValidated.value = true;
});

async function handleSubmit() {
  let address = form.address;
  const resolved = await resolver.resolveName(form.address);
  if (resolved?.address) address = resolved.address;
  emit('start', address.toLowerCase());
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
        :disabled="!formValidated || Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
