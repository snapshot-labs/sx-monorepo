<script setup lang="ts">
import { getNetwork, enabledNetworks } from '@/networks';
import { validateForm } from '@/helpers/validation';
import { SpaceMetadataDelegation } from '@/types';
import { clone } from '@/helpers/utils';

const DEFAULT_FORM_STATE = {
  name: '',
  apiType: null,
  apiUrl: null,
  contractNetwork: null,
  contractAddress: null
};

const form: Ref<SpaceMetadataDelegation> = ref(clone(DEFAULT_FORM_STATE));

const props = defineProps<{
  open: boolean;
  initialState?: SpaceMetadataDelegation;
}>();
const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataDelegation);
  (e: 'close'): void;
}>();

const availableNetworks = enabledNetworks
  .map(id => {
    const { name, readOnly } = getNetwork(id);

    return {
      id,
      name,
      readOnly
    };
  })
  .filter(network => !network.readOnly);

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Space',
    additionalProperties: true,
    required: ['name', 'apiType', 'apiUrl'],
    properties: {
      name: {
        type: 'string',
        title: 'Name',
        minLength: 1,
        examples: ['Delegation API name']
      },
      apiType: {
        type: ['string', 'null'],
        enum: [null, 'governor-subgraph'],
        options: [
          { id: null, name: 'No delegation API' },
          { id: 'governor-subgraph', name: 'Governor subgraph' }
        ],
        title: 'Delegation API type',
        nullable: true
      },
      ...(form.value.apiType !== null
        ? {
            apiUrl: {
              type: 'string',
              format: 'uri',
              title: 'Delegation API URL',
              examples: ['https://api.thegraph.com/subgraphs/name/arr00/uniswap-governance-v2']
            },
            contractNetwork: {
              type: 'string',
              enum: [null, ...availableNetworks.map(network => network.id)],
              options: [{ id: null, name: 'No delegation contract' }, ...availableNetworks],
              title: 'Delegation contract network',
              nullable: true
            },
            ...(form.value.contractNetwork !== null
              ? {
                  contractAddress: {
                    type: 'string',
                    title: 'Delegation contract address',
                    examples: ['0x0000…'],
                    format: 'address',
                    minLength: 1
                  }
                }
              : {})
          }
        : {})
    }
  };
});

const formErrors = computed(() =>
  validateForm(definition.value, form.value, { skipEmptyOptionalFields: true })
);

const formValid = computed(() => {
  return (
    Object.keys(formErrors.value).length === 0 &&
    form.value.apiType !== null &&
    form.value.apiUrl !== ''
  );
});

async function handleSubmit() {
  emit('add', form.value);
  emit('close');
}

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.value = clone(props.initialState);
    } else {
      form.value = clone(DEFAULT_FORM_STATE);
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Add delegation'" />
    </template>
    <div class="s-box p-4">
      <SIObject :model-value="form" :error="formErrors" :definition="definition" />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">Confirm</UiButton>
    </template>
  </UiModal>
</template>
