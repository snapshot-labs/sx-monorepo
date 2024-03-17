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

const props = defineProps<{
  open: boolean;
  initialState?: SpaceMetadataDelegation;
}>();
const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataDelegation);
  (e: 'close'): void;
}>();

const showPicker = ref(false);
const searchValue = ref('');
const form: Ref<SpaceMetadataDelegation> = ref(clone(DEFAULT_FORM_STATE));

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
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="'Add delegation'" />
      <template v-if="showPicker">
        <a class="absolute left-0 -top-1 p-4 text-color" @click="showPicker = false">
          <IH-arrow-narrow-left class="mr-2" />
        </a>
        <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
          <IH-search class="mx-2" />
          <input
            ref="searchInput"
            v-model="searchValue"
            type="text"
            placeholder="Search name or paste address"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <PickerContact
      v-if="showPicker"
      :loading="false"
      :search-value="searchValue"
      @pick="
        value => {
          form.contractAddress = value;
          showPicker = false;
        }
      "
    />
    <div v-else class="s-box p-4">
      <UiForm :model-value="form" :error="formErrors" :definition="definition" />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">Confirm</UiButton>
    </template>
  </UiModal>
</template>
