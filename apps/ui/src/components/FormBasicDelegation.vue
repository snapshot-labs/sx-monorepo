<script setup lang="ts">
import { getValidator } from '@/helpers/validation';
import { ChainId } from '@/types';

const delegatee = defineModel<string>('delegatee', {
  required: true
});
const isFormValidated = defineModel<boolean>('isFormValidated', {
  required: true
});
const isFormValid = defineModel<boolean>('isFormValid', {
  required: true
});

const props = defineProps<{
  chainId: ChainId;
}>();

const emit = defineEmits<{ (e: 'pick'): void }>();

const formErrors = ref({} as Record<string, any>);

const delegateDefinition = computed(() => ({
  type: 'string',
  format: 'ens-or-address',
  chainId: props.chainId,
  title: 'Delegatee',
  examples: ['Address or ENS']
}));

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    additionalProperties: false,
    required: ['delegatee'],
    properties: {
      delegatee: delegateDefinition.value
    }
  })
);

watchEffect(async () => {
  isFormValidated.value = false;
  formErrors.value = await formValidator.value.validateAsync({
    delegatee: delegatee.value
  });
  isFormValidated.value = true;
  isFormValid.value = Object.keys(formErrors.value).length === 0;
});
</script>

<template>
  <UiInputAddress
    v-model="delegatee"
    :definition="delegateDefinition"
    :error="formErrors.delegatee"
    :required="true"
    @pick="emit('pick')"
  />
</template>
