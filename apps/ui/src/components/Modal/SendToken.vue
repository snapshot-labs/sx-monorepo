<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { METADATA_BY_CHAIN_ID } from '@/composables/useBalances';
import { Token } from '@/helpers/alchemy';
import { ETH_CONTRACT } from '@/helpers/constants';
import { createSendTokenTransaction } from '@/helpers/transactions';
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { ChainId, Contact, Transaction } from '@/types';

const DEFAULT_FORM_STATE = {
  to: '',
  token: ETH_CONTRACT,
  amount: '',
  value: ''
};

const RECIPIENT_DEFINITION = {
  type: 'string',
  format: 'ens-or-address',
  title: 'Recipient',
  examples: ['Address or ENS']
};

const props = defineProps<{
  open: boolean;
  address: string;
  network: ChainId;
  extraContacts?: Contact[];
  initialState?: any;
}>();

const emit = defineEmits<{
  (e: 'add', transaction: Transaction);
  (e: 'close');
}>();

const searchInput: Ref<HTMLElement | null> = ref(null);
const form: {
  to: string;
  token: string;
  amount: string;
  value: string;
} = reactive(clone(DEFAULT_FORM_STATE));

const showPicker = ref(false);
const pickerType: Ref<'token' | 'contact' | null> = ref(null);
const searchValue = ref('');
const customTokens: Ref<Token[]> = ref([]);
const formValidated = ref(false);
const formErrors = ref({} as Record<string, any>);
const { loading, assets, assetsMap, loadBalances } = useBalances();

const allAssets = computed(() => [...assets.value, ...customTokens.value]);

const currentToken = computed(() => {
  let token = assetsMap.value?.get(form.token);
  if (!token)
    token = customTokens.value.find(
      existing => existing.contractAddress === form.token
    );

  const metadata = METADATA_BY_CHAIN_ID.get(props.network);

  if (!token) {
    return {
      decimals: 18,
      name: metadata?.name ?? 'Ether',
      symbol: metadata?.ticker ?? 'ETH',
      contractAddress: ETH_CONTRACT,
      logo: null,
      tokenBalance: '0x0',
      price: 0,
      value: 0,
      change: 0
    };
  }

  return token;
});

const amountDefinition = computed(() => ({
  type: 'string',
  decimals: currentToken.value?.decimals ?? 0,
  title: 'Amount',
  examples: ['0']
}));

const formValidator = computed(() =>
  getValidator({
    $async: true,
    type: 'object',
    title: 'TokenTransfer',
    additionalProperties: false,
    required: ['to', 'amount'],
    properties: {
      to: RECIPIENT_DEFINITION,
      amount: amountDefinition.value
    }
  })
);

const formValid = computed(
  () =>
    currentToken.value &&
    formValidated.value &&
    Object.keys(formErrors.value).length === 0 &&
    form.amount !== ''
);

function handleAddCustomToken(token: Token) {
  if (
    customTokens.value.find(
      existing => existing.contractAddress === token.contractAddress
    )
  ) {
    return;
  }

  customTokens.value.push(token);
}

function handlePickerClick(type: 'token' | 'contact') {
  showPicker.value = true;
  pickerType.value = type;

  searchValue.value = '';

  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus();
    }
  });
}

function handleAmountUpdate(value: string) {
  form.amount = value;

  if (value === '') {
    form.value = '';
  } else if (currentToken.value) {
    const float = parseFloat(value.replace(',', '.'));
    form.value = (float * currentToken.value.price).toFixed(2);
  }
}

function handleValueUpdate(value: string) {
  form.value = value;

  if (value === '') {
    form.amount = '';
  } else if (currentToken.value) {
    const decimals = Math.min(currentToken.value.decimals, 6);

    const float = parseFloat(value.replace(',', '.'));
    const parsed = (float / currentToken.value.price).toFixed(decimals);
    form.amount = parseFloat(parsed) === 0 ? '0' : parsed;
  }
}

function handleMaxClick() {
  if (currentToken.value) {
    handleAmountUpdate(
      formatUnits(currentToken.value.tokenBalance, currentToken.value.decimals)
    );
  }
}

async function handleSubmit() {
  const tx = await createSendTokenTransaction({
    token: currentToken.value,
    form: clone(form)
  });

  emit('add', tx);
  emit('close');
}

onMounted(() => {
  loadBalances(props.address, props.network);
});

watch(
  () => props.open,
  () => {
    showPicker.value = false;

    if (props.initialState) {
      form.to = props.initialState.recipient;
      form.token = props.initialState.token.address;
      handleAmountUpdate(
        formatUnits(
          props.initialState.amount,
          props.initialState.token.decimals
        )
      );
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.token = DEFAULT_FORM_STATE.token;
      handleAmountUpdate(DEFAULT_FORM_STATE.amount);
    }
  }
);

watch([() => props.address, () => props.network], ([address, network]) => {
  loadBalances(address, network);
});

watch(currentToken, token => {
  if (!token || form.amount === '') return;

  const amount = parseFloat(form.amount.replace(',', '.'));
  form.value = (amount * token.price).toFixed(2);
});

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.value.validateAsync({
    to: form.to,
    amount: form.amount
  });
  formValidated.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Send token'" />
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
            :placeholder="
              pickerType === 'token' ? 'Search name or paste address' : 'Search'
            "
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <template v-if="showPicker">
      <PickerToken
        v-if="pickerType === 'token'"
        :assets="allAssets"
        :address="address"
        :network="network"
        :loading="loading"
        :search-value="searchValue"
        @pick="
          form.token = $event;
          showPicker = false;
        "
        @add="handleAddCustomToken"
      />
      <PickerContact
        v-else-if="pickerType === 'contact'"
        :loading="false"
        :search-value="searchValue"
        :extra-contacts="extraContacts"
        @pick="
          form.to = $event;
          showPicker = false;
        "
      />
    </template>
    <div v-if="!showPicker" class="s-box p-4">
      <UiInputAddress
        v-model="form.to"
        :definition="RECIPIENT_DEFINITION"
        :error="formErrors.to"
        @pick="handlePickerClick('contact')"
      />
      <div class="s-base">
        <div class="s-label" v-text="'Token'" />
        <button
          type="button"
          class="s-input text-left h-[61px]"
          @click="handlePickerClick('token')"
        >
          <div class="flex items-center">
            <UiStamp
              v-if="currentToken"
              :id="`eip155:${network}:${currentToken.contractAddress}`"
              type="token"
              class="mr-2"
              :size="20"
            />
            <div class="truncate">
              {{ currentToken?.symbol || 'Select token' }}
            </div>
          </div>
        </button>
      </div>
      <div class="flex gap-2.5">
        <div class="relative w-full">
          <UiInputAmount
            :model-value="form.amount"
            :definition="amountDefinition"
            :error="formErrors.amount"
            @update:model-value="handleAmountUpdate"
          />
          <button
            type="button"
            class="absolute right-3 top-1"
            @click="handleMaxClick"
            v-text="'max'"
          />
        </div>
        <div v-if="currentToken.price !== 0" class="w-full">
          <UiInputAmount
            :model-value="form.value"
            :definition="{ type: 'number', title: 'USD', examples: ['0'] }"
            @update:model-value="handleValueUpdate"
          />
        </div>
      </div>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
