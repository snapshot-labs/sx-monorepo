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
    unitPrice: number;
    tokens: Token[];
    network: ChainId;
    barcodePayload: BarcodePayload;
    calculator?: (unitPrice: number, quantity: number) => number;
    quantityLabel?: string;
  }>(),
  {
    quantityLabel: 'Quantity',
    calculator: (unitPrice: number, quantity: number) => {
      return Number((unitPrice * quantity).toFixed(2));
    }
  }
);

const emit = defineEmits<{
  (e: 'close');
  (e: 'confirmed');
}>();

const { auth } = useWeb3();
const {
  start: startPaymentProcess,
  goToNextStep,
  isLastStep,
  currentStep
} = usePaymentFactory(toRef(props, 'network'));
const { isPending, assetsMap } = useBalances({
  treasury: toRef(() => {
    return auth.value
      ? {
          chainId: String(props.network),
          address: auth.value.account
        }
      : null;
  })
});

const selectedTokenAddress = ref<string>('');
const showPicker = ref(false);
const isHidden = ref(false);
const isModalTransactionProgressOpen = ref(false);
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
    !isPending.value &&
    auth.value?.account &&
    !isInsufficientBalance.value &&
    formValid.value
);

const totalAmount = computed(() => {
  return props.calculator(props.unitPrice, Number(form.value.quantity));
});

const formErrors = computed(() => {
  const validator = getValidator(definition.value);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

async function moveToNextStep() {
  if (isLastStep.value) {
    emit('confirmed');
    return;
  }

  isModalTransactionProgressOpen.value = false;

  if (await goToNextStep()) {
    isModalTransactionProgressOpen.value = true;
  }
}

function handleSubmit() {
  if (!canSubmit.value) return;

  startPaymentProcess();

  isHidden.value = true;
  isModalTransactionProgressOpen.value = true;
}

function handleTokenPick(address: string) {
  selectedTokenAddress.value = address;
  showPicker.value = false;
}

watch(
  () => props.open,
  open => {
    if (open) return;

    isTermsAccepted.value = false;
    showPicker.value = false;
    isHidden.value = false;
    selectedTokenAddress.value = '';
    form.value = clone(FORM);
  }
);
</script>

<template>
  <UiModal :open="open" :class="{ hidden: isHidden }" @close="emit('close')">
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
      </template>
    </template>
    <PickerToken
      v-if="showPicker"
      :assets="filteredAssets"
      :address="auth?.account || ''"
      :network="network"
      :loading="isPending"
      :search-value="''"
      @pick="handleTokenPick"
    />
    <div v-else class="s-box p-4 space-y-3">
      <div class="s-base">
        <div class="s-label" v-text="'Token *'" />
        <button
          type="button"
          class="s-input text-left h-[61px]"
          @click="showPicker = true"
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
      <div class="space-y-3">
        <div
          class="border rounded-lg text-[17px] bg-skin-input-bg p-3 py-2.5 space-y-1"
        >
          <div class="flex justify-between">
            You will pay
            <div class="flex items-center gap-1 text-skin-heading">
              <UiStamp
                :id="`eip155:${network}:${currentToken.contractAddress}`"
                :size="18"
                type="token"
              />
              {{ _n(totalAmount) }} {{ currentToken.symbol }}
            </div>
          </div>
          <div v-if="$slots.summary">
            <slot name="summary" :quantity="form.quantity" />
          </div>
        </div>
        <UiCheckbox v-model="isTermsAccepted" class="text-start">
          <div class="text-skin-text leading-[22px] top-[-1px] relative">
            I have read and agree to the
            <AppLink is-external :to="{ name: 'site-terms' }" @click.stop
              >Terms of service</AppLink
            >.
          </div>
        </UiCheckbox>
      </div>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton
        class="w-full"
        primary
        :disabled="!canSubmit"
        :loading="isPending"
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
    :open="isModalTransactionProgressOpen"
    :execute="
      () => currentStep.execute(currentToken, totalAmount, barcodePayload)
    "
    :chain-id="network"
    :messages="currentStep.messages"
    @close="
      isModalTransactionProgressOpen = false;
      emit('close');
    "
    @confirmed="moveToNextStep"
    @cancelled="
      isHidden = false;
      isModalTransactionProgressOpen = false;
    "
  >
    <template #headerContent="{ step, text }">
      <template v-if="step === 'success'">
        <slot name="transactionModalSuccessTitle">
          <h4
            class="font-semibold text-skin-heading text-lg flex flex-col items-center gap-2 mb-3"
          >
            Payment successful
          </h4>
          <slot name="transactionModalSuccessSubtitle" />
        </slot>
      </template>
      <template v-else>
        <h4
          class="font-semibold text-skin-heading text-lg"
          v-text="text.title"
        />
        <div v-text="text.subtitle" />
      </template>
    </template>
  </ModalTransactionProgress>
</template>
