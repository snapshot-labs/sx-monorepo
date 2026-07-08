<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100_000;
const AMOUNTS = [50, 100, 250];

const FORM_STATE = {
  amount: MIN_AMOUNT
};

const DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['amount'],
  properties: {
    amount: {
      type: 'integer',
      title: 'Amount (USD)',
      minimum: MIN_AMOUNT,
      maximum: MAX_AMOUNT,
      examples: [MIN_AMOUNT]
    }
  }
};

const props = defineProps<{
  open: boolean;
  topUp: (amount: number) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUiStore();

const step = ref<'select' | 'paying' | 'success'>('select');
const form = ref(clone(FORM_STATE));

const formValidator = getValidator(DEFINITION);

const formErrors = computed(() =>
  formValidator.validate(form.value, { skipEmptyOptionalFields: true })
);

const isValid = computed(() => !Object.keys(formErrors.value).length);

async function handlePayClick() {
  if (!isValid.value) return;

  try {
    step.value = 'paying';
    await props.topUp(Number(form.value.amount));
    step.value = 'success';
  } catch (err) {
    console.error('Failed to top up', err);
    uiStore.addNotification(
      'error',
      'An error occurred while processing your payment, please try again.'
    );
    step.value = 'select';
  }
}

watch(
  () => props.open,
  open => {
    if (open) return;

    step.value = 'select';
    form.value = clone(FORM_STATE);
  }
);
</script>

<template>
  <UiModal :open="open" :closeable="step !== 'paying'" @close="emit('close')">
    <template #header>
      <h3
        v-text="step === 'success' ? 'Payment successful' : 'Top up credit'"
      />
    </template>
    <div v-if="step === 'select'" class="s-box p-4 space-y-3">
      <div class="text-sm leading-[18px]">
        Add credit to your balance. Usage is billed per request and credit never
        expires.
      </div>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          v-for="amount in AMOUNTS"
          :key="amount"
          type="button"
          :class="[
            'border rounded-lg py-3',
            { 'border-skin-link': Number(form.amount) === amount }
          ]"
          @click="form.amount = amount"
        >
          <span class="text-lg font-semibold text-skin-heading">
            ${{ amount }}
          </span>
        </button>
      </div>
      <UiInputNumber
        v-model="form.amount"
        :definition="DEFINITION.properties.amount"
        :error="formErrors.amount"
      />
    </div>
    <div
      v-else-if="step === 'paying'"
      class="p-4 py-8 flex flex-col items-center gap-3 text-center"
    >
      <UiLoading />
      <h4 class="text-skin-heading">Processing payment</h4>
      <div class="text-sm leading-[18px] max-w-[280px]">
        Confirming your top-up of ${{ form.amount }}.
      </div>
    </div>
    <div v-else class="p-4 py-8 text-center">
      <h4 class="font-semibold text-skin-heading text-lg mb-1">Credit added</h4>
      <div>${{ form.amount }} has been added to your balance.</div>
    </div>
    <template v-if="step !== 'paying'" #footer>
      <UiButton
        v-if="step === 'select'"
        class="w-full"
        primary
        :disabled="!isValid"
        @click="handlePayClick"
      >
        <template v-if="isValid">Pay ${{ form.amount }}</template>
        <template v-else>Pay</template>
      </UiButton>
      <UiButton v-else class="w-full" @click="emit('close')">Done</UiButton>
    </template>
  </UiModal>
</template>
