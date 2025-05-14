<script setup lang="ts">
import { getValidator } from '@/helpers/validation';
import { ChainId } from '@/types';

type Delegatee = {
  id: string;
};

const form = defineModel<{
  delegatees: Delegatee[];
  chainId: ChainId;
}>('form', {
  required: true
});
const isFormValidated = defineModel<boolean>('isFormValidated', {
  required: true
});
const isFormValid = defineModel<boolean>('isFormValid', {
  required: true
});

const emit = defineEmits<{ (e: 'pick'): void }>();

const formErrors = ref({} as Record<string, any>);

const delegateDefinition = computed(() => ({
  type: 'string',
  format: 'ens-or-address',
  chainId: form.value.chainId,
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
    delegatee: form.value.delegatees[0].id
  });
  isFormValidated.value = true;
  isFormValid.value = !Object.keys(formErrors.value).length;
});
</script>

<template>
  <UiInputAddress
    v-model="form.delegatees[0].id"
    :definition="delegateDefinition"
    :error="formErrors.delegatees?.[0]?.id"
    :required="true"
    @pick="emit('pick')"
  />
</template>
