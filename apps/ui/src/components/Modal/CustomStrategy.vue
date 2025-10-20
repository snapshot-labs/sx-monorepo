<script setup lang="ts">
import { Contract } from '@ethersproject/contracts';
import { getProvider } from '@/helpers/provider';
import { getValidator } from '@/helpers/validation';
import { ChainId, NetworkID } from '@/types';

const ABI = ['function getStrategyType() pure returns (string)'];

const props = withDefaults(
  defineProps<{
    open: boolean;
    networkId: NetworkID;
    chainId: ChainId;
  }>(),
  {}
);

const emit = defineEmits<{
  (e: 'close');
  (e: 'save', strategy: { address: string; type: string });
}>();

const uiStore = useUiStore();

const showPicker = ref(false);
const searchValue = ref('');
const contractAddress = ref('');
const isSubmitting = ref(false);

const definition = computed(() => ({
  type: 'string',
  title: 'Contract Address',
  format: 'address',
  examples: ['0x0000…'],
  chainId: props.chainId
}));

const formErrors = computed(() => {
  return getValidator({
    type: 'object',
    required: ['contractAddress'],
    properties: {
      contractAddress: definition.value
    }
  }).validate({ contractAddress: contractAddress.value });
});

async function handleSubmit() {
  if (Object.keys(formErrors.value).length > 0) return;

  try {
    isSubmitting.value = true;

    const contract = new Contract(
      contractAddress.value,
      ABI,
      getProvider(props.chainId as number)
    );

    const type = await contract.getStrategyType();

    emit('save', {
      address: contractAddress.value,
      type
    });
  } catch (e) {
    console.error('Failed to fetch strategy type', e);
    uiStore.addNotification(
      'error',
      'Failed to load strategy details. Make sure correct address is used.'
    );
  } finally {
    isSubmitting.value = false;
  }
}

watchEffect(() => {
  if (props.open) {
    contractAddress.value = '';
  }
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Add Custom Strategy</h3>
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
          contractAddress = value;
          showPicker = false;
        }
      "
    />
    <div v-else class="s-box p-4">
      <UiInputAddress
        v-model="contractAddress"
        :definition="definition"
        :error="formErrors.contractAddress"
        @pick="showPicker = true"
      />
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton
        :loading="isSubmitting"
        class="w-full"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
