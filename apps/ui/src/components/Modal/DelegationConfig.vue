<script setup lang="ts">
import { DELEGATION_TYPES_NAMES } from '@/helpers/constants';
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { offchainNetworks } from '@/networks';
import { NetworkID, SpaceMetadataDelegation } from '@/types';

const DEFAULT_FORM_STATE = {
  name: '',
  apiType: null,
  apiUrl: null,
  contractAddress: null,
  chainId: null
};

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  initialState?: SpaceMetadataDelegation;
}>();
const emit = defineEmits<{
  (e: 'add', config: SpaceMetadataDelegation): void;
  (e: 'close'): void;
}>();

const showPicker = ref(false);
const searchValue = ref('');
const form: Ref<SpaceMetadataDelegation> = ref(clone(DEFAULT_FORM_STATE));

const isApeChainDelegateRegistry = computed(
  () => form.value.apiType === 'apechain-delegate-registry'
);

const delegationOptions = computed(() => {
  if (form.value.chainId === null) return {};

  if (isApeChainDelegateRegistry.value) {
    return {
      contractAddress: {
        type: 'string',
        format: 'bytes32',
        title: 'Delegation ID',
        examples: [
          'e.g. 0x0000000000000000000000000000000000000000000000000000000000000001'
        ],
        minLength: 1
      }
    };
  }

  return {
    contractAddress: {
      type: 'string',
      title: 'Delegation contract address',
      examples: ['0x0000…'],
      format: 'address',
      chainId: form.value.chainId,
      minLength: 1
    }
  };
});

const definition = computed(() => {
  return {
    type: 'object',
    title: 'Space',
    additionalProperties: true,
    required: ['name', 'apiType', 'apiUrl'],
    properties: {
      ...(!offchainNetworks.includes(props.networkId)
        ? {
            name: {
              type: 'string',
              title: 'Name',
              minLength: 1,
              maxLength: 32,
              examples: ['Delegation API name']
            }
          }
        : {}),
      apiType: {
        type: ['string', 'null'],
        enum: [null, 'governor-subgraph', 'apechain-delegate-registry'],
        options: [
          { id: null, name: 'No delegation API' },
          {
            id: 'governor-subgraph',
            name: DELEGATION_TYPES_NAMES['governor-subgraph']
          },
          {
            id: 'apechain-delegate-registry',
            name: DELEGATION_TYPES_NAMES['apechain-delegate-registry']
          }
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
            chainId: {
              type: ['string', 'number', 'null'],
              format: 'network',
              networkId: props.networkId,
              networksListKind: 'full',
              networksFilter: isApeChainDelegateRegistry.value
                ? ['33139', '33111']
                : undefined,
              title: 'Delegation contract network',
              nullable: true
            },
            ...delegationOptions.value
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
  const config = clone(form.value);
  if (offchainNetworks.includes(props.networkId) && config.apiType) {
    config.name = DELEGATION_TYPES_NAMES[config.apiType];
  }

  emit('add', config);
  emit('close');
}

watch(
  () => form.value.apiType,
  (_, previousApiType) => {
    if (!previousApiType) return;

    form.value.chainId = null;
    form.value.contractAddress = null;
  }
);

watch(
  () => props.open,
  () => {
    showPicker.value = false;

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
        <UiModalSearchInput
          v-model="searchValue"
          placeholder="Search name or paste address"
        />
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
