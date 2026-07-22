<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { Token } from '@/composables/usePayment';
import { BarcodePayload } from '@/composables/usePaymentFactory';
import { _n, clone, compareAddresses } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

type PaymentMethod = 'crypto' | 'card';

const FORM = {
  quantity: 1
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    unitPrice: number;
    tokens: Token[];
    network: string;
    barcodePayload: BarcodePayload;
    space?: string;
    isAuthValidForCrypto?: boolean;
    plan?: 'monthly' | 'yearly';
    calculator?: (unitPrice: number, quantity: number) => number;
    quantityLabel?: string;
  }>(),
  {
    isAuthValidForCrypto: false,
    plan: 'yearly',
    quantityLabel: 'Quantity',
    calculator: (unitPrice: number, quantity: number) => {
      return Number((unitPrice * quantity).toFixed(2));
    }
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirmed'): void;
  (e: 'connectWallet'): void;
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
          chainId: props.network,
          address: auth.value.account
        }
      : null;
  })
});
const { isWhiteLabel } = useWhiteLabel();
const { redirectToCheckout, isLoading } = useStripeCheckout();
const uiStore = useUiStore();

const paymentMethod = ref<PaymentMethod>('crypto');
const selectedTokenAddress = ref<string>('');
const isPickerShown = ref(false);
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

const isLoginRequired = computed(
  () => paymentMethod.value === 'crypto' && !props.isAuthValidForCrypto
);

const canSubmit = computed(() => {
  if (!isTermsAccepted.value) return false;
  if (paymentMethod.value === 'card') return !isLoading.value;
  return (
    formValid.value &&
    !isPending.value &&
    !!auth.value?.account &&
    props.isAuthValidForCrypto &&
    !isInsufficientBalance.value
  );
});

const isQuantityAdjustable = computed(() => paymentMethod.value === 'crypto');

const effectiveQuantity = computed(() =>
  isQuantityAdjustable.value
    ? Math.max(1, Math.floor(Number(form.value.quantity)) || 1)
    : 1
);

const totalAmount = computed(() =>
  props.calculator(props.unitPrice, effectiveQuantity.value)
);

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

  goToNextStep();

  nextTick(() => {
    isModalTransactionProgressOpen.value = true;
  });
}

async function handleSubmit() {
  if (isLoginRequired.value) {
    emit('connectWallet');
    return;
  }

  if (!canSubmit.value) return;

  if (paymentMethod.value === 'card') {
    if (!props.space) return;
    try {
      await redirectToCheckout({
        space: props.space,
        plan: props.plan
      });
    } catch (err) {
      console.error('[stripe] checkout failed', err);
      uiStore.addNotification(
        'error',
        err instanceof Error ? err.message : 'Failed to start checkout'
      );
    }
    return;
  }

  startPaymentProcess();
  isHidden.value = true;
  isModalTransactionProgressOpen.value = true;
}

function handleTokenPick(address: string) {
  selectedTokenAddress.value = address;
  isPickerShown.value = false;
}

watch(
  () => props.isAuthValidForCrypto,
  isValid => {
    if (!isValid) isPickerShown.value = false;
  }
);

watch(
  () => props.open,
  open => {
    if (open) return;

    isTermsAccepted.value = false;
    isPickerShown.value = false;
    isHidden.value = false;
    selectedTokenAddress.value = '';
    paymentMethod.value = 'crypto';
    form.value = clone(FORM);
  }
);
</script>

<template>
  <UiModal
    :open="open"
    class="modal-payment"
    :class="{ hidden: isHidden }"
    :closeable="!isLoading"
    @close="emit('close')"
  >
    <template #header>
      <h3>Payment</h3>
      <template v-if="isPickerShown">
        <button
          type="button"
          class="absolute left-0 -top-1 p-4"
          @click="isPickerShown = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </button>
      </template>
    </template>
    <PickerToken
      v-if="isPickerShown"
      :assets="filteredAssets"
      :address="auth?.account || ''"
      :network="network"
      :loading="isPending && !!auth?.account"
      :search-value="''"
      @pick="handleTokenPick"
    />
    <template v-else>
      <div class="flex space-x-3 border-b px-4">
        <button
          type="button"
          class="flex items-center gap-2 py-2 mb-[-1px] text-sm uppercase tracking-[1px] hover:text-skin-link"
          :class="
            paymentMethod === 'crypto'
              ? 'text-skin-link border-b border-skin-link'
              : 'text-skin-text'
          "
          @click="paymentMethod = 'crypto'"
        >
          <IH-cash />
          Crypto
        </button>
        <button
          type="button"
          class="flex items-center gap-2 py-2 mb-[-1px] text-sm uppercase tracking-[1px] hover:text-skin-link"
          :class="
            paymentMethod === 'card'
              ? 'text-skin-link border-b border-skin-link'
              : 'text-skin-text'
          "
          @click="paymentMethod = 'card'"
        >
          <IH-credit-card />
          Card
        </button>
      </div>
      <div class="s-box p-4 space-y-3">
        <div v-if="paymentMethod === 'crypto'" class="s-base">
          <div class="s-label" v-text="'Token *'" />
          <button
            type="button"
            class="s-input text-left h-[61px]"
            @click="isPickerShown = true"
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
          v-if="quantityLabel && isQuantityAdjustable"
          v-model="form.quantity"
          :definition="definition.properties.quantity"
          :error="formErrors.quantity"
        />
        <div class="space-y-3">
          <div
            class="border rounded-lg text-[17px] bg-skin-border/40 p-3 py-2.5 space-y-1"
          >
            <div class="flex justify-between">
              You will pay
              <div
                class="text-skin-heading"
                :class="{
                  'flex items-center gap-1': paymentMethod === 'crypto'
                }"
              >
                <UiStamp
                  v-if="paymentMethod === 'crypto'"
                  :id="`eip155:${network}:${currentToken.contractAddress}`"
                  :size="18"
                  type="token"
                />
                {{ _n(totalAmount) }}
                {{ paymentMethod === 'crypto' ? currentToken.symbol : 'USD' }}
              </div>
            </div>
            <div v-if="$slots.summary">
              <slot
                name="summary"
                :quantity="effectiveQuantity"
                :payment-method="paymentMethod"
              />
            </div>
          </div>
          <UiCheckbox v-model="isTermsAccepted" class="text-start">
            <div class="text-skin-text leading-[22px] top-[-1px] relative">
              I have read and agree to the
              <span @click.stop>
                <AppLink
                  :to="
                    isWhiteLabel
                      ? 'https://snapshot.box/#/terms-of-use'
                      : { name: 'site-terms' }
                  "
                  @click.stop
                  >Terms of service</AppLink
                ></span
              >.
            </div>
          </UiCheckbox>
        </div>
      </div>
    </template>
    <template v-if="!isPickerShown" #footer>
      <UiButton
        class="w-full"
        primary
        :disabled="!isLoginRequired && !canSubmit"
        :loading="
          paymentMethod === 'card' ? isLoading : !isLoginRequired && isPending
        "
        @click="handleSubmit"
      >
        <template v-if="isLoginRequired">Log in</template>
        <template v-else-if="paymentMethod === 'card'">Checkout</template>
        <template v-else-if="isInsufficientBalance">
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

<style lang="scss">
.modal.modal-payment .shell .modal-body {
  max-height: none;
}
</style>
