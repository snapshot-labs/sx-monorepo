<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { Token } from '@/composables/usePayment';
import { BarcodePayload } from '@/composables/usePaymentFactory';
import { _n, clone, compareAddresses } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { ChainId } from '@/types';

const FORM = {
  quantity: 1
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    amount: number;
    tokens: Token[];
    network: ChainId;
    barcodePayload: BarcodePayload;
    quantityLabel?: string | false;
  }>(),
  {
    quantityLabel: 'Quantity'
  }
);

const emit = defineEmits<{
  (e: 'close');
}>();

const {
  start: startPaymentProcess,
  goToNextStep,
  isLastStep,
  currentStep
} = usePaymentFactory(props.network);
const { loading, assetsMap, loadBalances } = useBalances();
const { web3 } = useWeb3();

const searchInput: Ref<HTMLElement | null> = ref(null);
const selectedTokenAddress = ref<string>('');
const showPicker = ref(false);
const searchValue = ref('');
const modalTransactionProgressOpen = ref(false);
const isTermsAccepted = ref(false);
const form = ref(clone(FORM));

const definition = computed(() => ({
  type: 'object',
  title: 'Payment',
  additionalProperties: false,
  required: ['quantity'],
  properties: {
    quantity: {
      type: 'integer',
      title: props.quantityLabel || '',
      minimum: 1,
      examples: [FORM.quantity]
    }
  }
}));

const currentToken = computed(() => {
  return (
    filteredAssets.value.find(asset =>
      compareAddresses(asset.contractAddress, selectedTokenAddress.value)
    ) || filteredAssets.value[0]
  );
});

const filteredAssets = computed(() => {
  return props.tokens.map(token => {
    return (
      assetsMap.value.get(token.contractAddress) || {
        ...token,
        name: token.symbol,
        logo: null,
        tokenBalance: '0x0',
        price: 0,
        value: 0,
        change: 0
      }
    );
  });
});

const isInsufficientBalance = computed(() => {
  return (
    Number(
      formatUnits(currentToken.value.tokenBalance, currentToken.value.decimals)
    ) < totalAmount.value
  );
});

const canSubmit = computed(
  () =>
    isTermsAccepted.value &&
    !loading.value &&
    web3.value.account &&
    !isInsufficientBalance.value &&
    formValid.value
);

const totalAmount = computed(() => {
  return props.amount * Number(form.value.quantity);
});

const formErrors = computed(() => {
  const validator = getValidator(definition.value);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

function handleSubmit() {
  if (!canSubmit.value) return;

  startPaymentProcess();

  emit('close');
  modalTransactionProgressOpen.value = true;
}

function handlePickerClick() {
  showPicker.value = true;
  searchValue.value = '';

  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus();
    }
  });
}

function handleTokenPick(address: string) {
  selectedTokenAddress.value = address;
  showPicker.value = false;
}

async function moveToNextStep() {
  if (isLastStep.value) return;

  modalTransactionProgressOpen.value = false;

  if (await goToNextStep()) {
    modalTransactionProgressOpen.value = true;
  }
}

watch([() => props.open, () => web3.value.account], ([open, account]) => {
  if (!open) {
    isTermsAccepted.value = false;
    selectedTokenAddress.value = '';
    form.value = clone(FORM);
    return;
  }

  loadBalances(account, props.network);
});
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Payment</h3>
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
            :placeholder="'Search name or paste address'"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <PickerToken
      v-if="showPicker"
      :assets="filteredAssets"
      :address="web3.account"
      :network="network"
      :loading="loading"
      :search-value="searchValue"
      @pick="handleTokenPick"
    />
    <div v-else class="s-box p-4 pb-[10px] space-y-3">
      <div class="s-base">
        <div class="s-label" v-text="'Token *'" />
        <button
          type="button"
          class="s-input text-left h-[61px]"
          @click="handlePickerClick()"
        >
          <div class="flex items-center">
            <UiStamp
              v-if="currentToken"
              :id="`eip155:${network}:${currentToken.contractAddress}`"
              type="token"
              class="mr-2"
              :size="20"
            />
            <div class="truncate" v-text="currentToken.symbol" />
          </div>
        </button>
      </div>
      <UiInputNumber
        v-if="quantityLabel"
        v-model="form.quantity"
        :definition="definition.properties.quantity"
        :error="formErrors.quantity"
      />
    </div>
    <template v-if="!showPicker" #footer>
      <div class="border rounded-lg mb-4 bg-skin-input-bg p-3 py-2.5">
        <div class="flex justify-between">
          You will pay
          <div class="flex items-center gap-1">
            <UiStamp
              :id="`eip155:${network}:${currentToken.contractAddress}`"
              :size="18"
              type="token"
            />
            {{ _n(totalAmount) }} {{ currentToken.symbol }}
          </div>
        </div>
      </div>
      <UiCheckbox v-model="isTermsAccepted" class="mb-3 text-start">
        <div class="text-skin-text leading-[22px] top-[-1px] relative">
          Before confirming, please read and agree to the
          <AppLink :to="{ name: 'site-terms' }">Terms of service </AppLink>.
        </div>
      </UiCheckbox>
      <UiButton
        class="w-full"
        primary
        :disabled="!canSubmit"
        :loading="loading"
        @click="handleSubmit"
      >
        <template v-if="isInsufficientBalance">
          Insufficient {{ currentToken.symbol }}
        </template>
        <template v-else>Pay</template>
      </UiButton>
    </template>
  </UiModal>
  <ModalTransactionProgress
    :open="modalTransactionProgressOpen"
    :execute="
      () => currentStep.execute(currentToken, totalAmount, barcodePayload)
    "
    :chain-id="network"
    :messages="currentStep.messages"
    @close="modalTransactionProgressOpen = false"
    @confirmed="moveToNextStep"
  >
    <template #successTitle>
      <h4 class="font-semibold text-skin-heading text-lg">
        Upgraded to <ICPro class="w-[44px] inline" />
      </h4>
    </template>
    <template #successSubtitle>Thank you for your subscription!</template>
  </ModalTransactionProgress>
</template>

<style lang="scss" scoped>
.pill-switcher {
  @apply flex border rounded-full p-1 items-center leading-[22px] bg-skin-bg;

  button {
    @apply grow justify-center rounded-full py-1 flex items-center px-2 gap-1 text-skin-link;
  }
}
</style>
