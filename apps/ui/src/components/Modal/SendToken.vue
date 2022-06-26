<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, nextTick, Ref } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { useBalances } from '@/composables/useBalances';
import { createSendTokenTransaction } from '@/helpers/transactions';
import { ETH_CONTRACT } from '@/helpers/constants';
import { clone } from '@/helpers/utils';

const DEFAULT_FORM_STATE = {
  to: '',
  token: ETH_CONTRACT,
  amount: '',
  value: ''
};

const props = defineProps({
  open: Boolean,
  address: {
    type: String,
    required: true
  },
  initialState: Object
});

const emit = defineEmits(['add', 'close']);

const searchInput: Ref<HTMLElement | null> = ref(null);
const form: {
  to: string;
  token: string;
  amount: string | number;
  value: string | number;
} = reactive(clone(DEFAULT_FORM_STATE));

const showPicker = ref(false);
const searchValue = ref('');
const { loading, assets, assetsMap, loadBalances } = useBalances();

const currentToken = computed(() => {
  const token = assetsMap.value?.get(form.token);

  if (!token) {
    return {
      contract_decimals: 18,
      contract_name: 'Ether',
      contract_ticker_symbol: 'ETH',
      contract_address: ETH_CONTRACT
    };
  }

  return token;
});
const formValid = computed(
  () => currentToken.value && form.to && form.amount !== ''
);

onMounted(() => {
  loadBalances(props.address);
});

function handlePickerClick() {
  showPicker.value = true;

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
    form.value = parseFloat((value * currentToken.value.quote_rate).toFixed(2));
  }
}

function handleValueUpdate(value) {
  form.value = value;

  if (value === '') {
    form.amount = '';
  } else if (currentToken.value) {
    form.amount = value / currentToken.value.quote_rate;
  }
}

function handleMaxClick() {
  if (currentToken.value) {
    handleAmountUpdate(
      formatUnits(
        currentToken.value.balance,
        currentToken.value.contract_decimals
      )
    );
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

watch(currentToken, token => {
  if (!token || typeof form.amount === 'string') return;

  form.value = parseFloat((form.amount * token.quote_rate).toFixed(2));
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Send token'" />
      <template v-if="showPicker">
        <a
          class="absolute left-0 -top-1 p-4 text-color"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </a>
        <div class="flex items-center border-t px-2 py-2 mt-3 -mb-3">
          <IH-search class="mr-2" />
          <input
            v-model="searchValue"
            ref="searchInput"
            type="text"
            placeholder="Search"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <BlockTokenPicker
      v-if="showPicker"
      :assets="assets"
      :loading="loading"
      :searchValue="searchValue"
      @pick="
        form.token = $event;
        showPicker = false;
      "
    />
    <div class="s-box p-4" v-if="!showPicker">
      <SIString
        v-model="form.to"
        :definition="{
          type: 'string',
          title: 'Recipient',
          examples: ['Address or ENS']
        }"
      />
      <div class="s-base">
        <div v-text="'Token'" class="s-label" />
        <button class="s-input text-left h-[61px]" @click="handlePickerClick">
          <div class="flex items-center">
            <Stamp
              v-if="currentToken"
              type="token"
              class="mr-1"
              :id="currentToken.contract_address"
              :size="20"
            />
            {{ currentToken?.contract_name || 'Select token' }}
          </div>
        </button>
      </div>
      <div class="grid grid-cols-2 gap-[12px]">
        <div class="relative">
          <SINumber
            :modelValue="form.amount"
            @update:modelValue="handleAmountUpdate"
            :definition="{
              type: 'number',
              title: 'Amount',
              examples: ['0']
            }"
          />
          <a class="absolute right-[16px] top-[4px]" @click="handleMaxClick"
            >Max</a
          >
        </div>
        <SINumber
          :modelValue="form.value"
          @update:modelValue="handleValueUpdate"
          :definition="{ type: 'number', title: 'USD', examples: ['0'] }"
        />
      </div>
    </div>
    <template v-slot:footer v-if="!showPicker">
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
