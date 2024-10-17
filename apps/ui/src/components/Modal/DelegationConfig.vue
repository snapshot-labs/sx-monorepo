<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { offchainNetworks } from '@/networks';
import { NetworkID, SpaceMetadataDelegation } from '@/types';

const DEFAULT_FORM_STATE = {
  name: '',
  apiType: null,
  apiUrl: null,
  contractNetwork: null,
  contractAddress: null,
  chainId: null
};

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  initialState?: SpaceMetadataDelegation;
}>();
const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataDelegation);
  (e: 'close'): void;
}>();

const showPicker = ref(false);
const searchValue = ref('');
const form: Ref<SpaceMetadataDelegation> = ref(clone(DEFAULT_FORM_STATE));

const networkField = computed(() =>
  offchainNetworks.includes(props.networkId) ? 'chainId' : 'contractNetwork'
);

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
        maxLength: 32,
        examples: ['Delegation API name']
      },
      apiType: {
        type: ['string', 'null'],
        enum: [null, 'governor-subgraph'],
        options: [
          { id: null, name: 'No delegation API' },
          { id: 'governor-subgraph', name: 'ERC-20 Votes' }
        ],
        title: 'Delegation type',
        nullable: true
      },
      ...(form.value.apiType !== null
        ? {
            apiUrl: {
              type: 'string',
              format: 'uri',
              title: 'Delegation API URL',
              examples: [
                'https://api.thegraph.com/subgraphs/name/arr00/uniswap-governance-v2'
              ]
            },
            [networkField.value]: {
              type: ['string', 'number', 'null'],
              format: 'network',
              networkId: props.networkId,
              title: 'Delegation contract network',
              nullable: true
            },
            ...(form.value[networkField.value] !== null
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
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
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
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
        @pick="showPicker = true"
      />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit"
        >Confirm</UiButton
      >
    </template>
  </UiModal>
</template>
