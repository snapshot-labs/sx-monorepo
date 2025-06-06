<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
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

const props = defineProps<{ chainIds: ChainId[] }>();

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

const availableNetworks = computed(() => {
  return Object.entries(networks)
    .filter(([, network]) => props.chainIds.includes(network.chainId))
    .map(([, network]) => ({
      id: network.chainId,
      name: network.name,
      icon: h('img', {
        src: getUrl(network.logo),
        alt: network.name,
        class: 'rounded-full'
      })
    }));
});

const networkDefinition = computed(() => {
  return {
    type: 'number',
    title: 'Network',
    tooltip: '',
    examples: ['Select network'],
    enum: availableNetworks.value.map(c => c.id),
    options: availableNetworks.value
  };
});

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
  <Combobox
    v-if="availableNetworks.length > 1"
    v-model="form.chainId"
    :definition="networkDefinition"
  />
</template>
