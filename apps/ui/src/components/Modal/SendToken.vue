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
  network: {
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
  loadBalances(props.address, props.network);
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
    <template #header>
      <h3 v-text="'Send token'" />
      <template v-if="showPicker">
        <a
          class="absolute left-0 -top-1 p-4 text-color"
          @click="showPicker = false"
        >
          <IH-arrow-narrow-left class="mr-2" />
        </a>
        <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
          <IH-search class="mx-2" />
          <input
            ref="searchInput"
            v-model="searchValue"
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
      :search-value="searchValue"
      @pick="
        form.token = $event;
        showPicker = false;
      "
    />
    <div v-if="!showPicker" class="s-box p-4">
      <SIString
        v-model="form.to"
        :definition="{
          type: 'string',
          title: 'Recipient',
          examples: ['Address or ENS']
        }"
      />
      <div class="s-base">
        <div class="s-label" v-text="'Token'" />
        <button class="s-input text-left h-[61px]" @click="handlePickerClick">
          <div class="flex items-center">
            <Stamp
              v-if="currentToken"
              :id="currentToken.contract_address"
              type="token"
              class="mr-2"
              :size="20"
            />
            <div class="truncate">
              {{ currentToken?.contract_ticker_symbol || 'Select token' }}
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
          <a
            class="absolute right-[16px] top-[4px]"
            @click="handleMaxClick"
            v-text="'max'"
          />
        </div>
        <SINumber
          :model-value="form.value"
          :definition="{ type: 'number', title: 'USD', examples: ['0'] }"
          @update:model-value="handleValueUpdate"
        />
      </div>
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
