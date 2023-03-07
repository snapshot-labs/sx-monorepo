<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, nextTick, Ref } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { useBalances } from '@/composables/useBalances';
import { createSendTokenTransaction } from '@/helpers/transactions';
import { ETH_CONTRACT } from '@/helpers/constants';
import { clone } from '@/helpers/utils';
import type { Token } from '@/helpers/alchemy';
import type { Transaction } from '@/types';

const DEFAULT_FORM_STATE = {
  to: '',
  token: ETH_CONTRACT,
  amount: '',
  value: ''
};

const props = defineProps<{
  open: boolean;
  address: string;
  network: number;
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
  amount: string | number;
  value: string | number;
} = reactive(clone(DEFAULT_FORM_STATE));

const showPicker = ref(false);
const pickerType: Ref<'token' | 'contact' | null> = ref(null);
const searchValue = ref('');
const customTokens: Ref<Token[]> = ref([]);
const { loading, assets, assetsMap, loadBalances } = useBalances();

const allAssets = computed(() => [...assets.value, ...customTokens.value]);

const currentToken = computed(() => {
  let token = assetsMap.value?.get(form.token);
  if (!token) token = customTokens.value.find(existing => existing.contractAddress === form.token);

  if (!token) {
    return {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
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
const formValid = computed(() => currentToken.value && form.to && form.amount !== '');

onMounted(() => {
  loadBalances(props.address, props.network);
});

function handleAddCustomToken(token: Token) {
  if (customTokens.value.find(existing => existing.contractAddress === token.contractAddress)) {
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

function handleAmountUpdate(value) {
  form.amount = value;

  if (value === '') {
    form.value = '';
  } else if (currentToken.value) {
    form.value = parseFloat((value * currentToken.value.price).toFixed(2));
  }
}

function handleValueUpdate(value) {
  form.value = value;

  if (value === '') {
    form.amount = '';
  } else if (currentToken.value) {
    form.amount = value / currentToken.value.price;
  }
}

function handleMaxClick() {
  if (currentToken.value) {
    handleAmountUpdate(formatUnits(currentToken.value.tokenBalance, currentToken.value.decimals));
  }
}

function handleSubmit() {
  const tx = createSendTokenTransaction({
    token: currentToken.value,
    form: clone(form)
  });

  emit('add', tx);
  emit('close');
}

watch(
  () => props.open,
  () => {
    showPicker.value = false;

    if (props.initialState) {
      form.to = props.initialState.recipient;
      form.token = props.initialState.token.address;
      handleAmountUpdate(formatUnits(props.initialState.amount, props.initialState.token.decimals));
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.token = DEFAULT_FORM_STATE.token;
      handleAmountUpdate(DEFAULT_FORM_STATE.amount);
    }
  }
);

watch(currentToken, token => {
  if (!token || typeof form.amount === 'string') return;

  form.value = parseFloat((form.amount * token.price).toFixed(2));
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Send token'" />
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
            :placeholder="pickerType === 'token' ? 'Search name or paste address' : 'Search'"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <template v-if="showPicker">
      <BlockTokenPicker
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
      <BlockContactPicker
        v-else-if="pickerType === 'contact'"
        :loading="false"
        :search-value="searchValue"
        @pick="
          form.to = $event;
          showPicker = false;
        "
      />
    </template>
    <div v-if="!showPicker" class="s-box p-4">
      <SIAddress
        v-model="form.to"
        :definition="{
          type: 'string',
          title: 'Recipient',
          examples: ['Address or ENS']
        }"
        @pick="handlePickerClick('contact')"
      />
      <div class="s-base">
        <div class="s-label" v-text="'Token'" />
        <button class="s-input text-left h-[61px]" @click="handlePickerClick('token')">
          <div class="flex items-center">
            <Stamp
              v-if="currentToken"
              :id="currentToken.contractAddress"
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
      <div class="grid grid-cols-2 gap-[12px]">
        <div class="relative">
          <SINumber
            :model-value="form.amount"
            :definition="{
              type: 'number',
              title: 'Amount',
              examples: ['0']
            }"
            @update:model-value="handleAmountUpdate"
          />
          <a class="absolute right-[16px] top-[4px]" @click="handleMaxClick" v-text="'max'" />
        </div>
        <SINumber
          :model-value="form.value"
          :definition="{ type: 'number', title: 'USD', examples: ['0'] }"
          @update:model-value="handleValueUpdate"
        />
      </div>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit"> Confirm </UiButton>
    </template>
  </UiModal>
</template>
