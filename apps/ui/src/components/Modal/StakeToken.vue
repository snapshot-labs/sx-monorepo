<script setup lang="ts">
import { Token } from '@/helpers/alchemy';
import { ETH_CONTRACT } from '@/helpers/constants';
import { formatUnits } from '@ethersproject/units';
import { NetworkID, Transaction } from '@/types';
import { clone } from '@/helpers/utils';
import { createStakeTokenTransaction } from '@/helpers/transactions';

const STAKING_CONTRACTS = {
  eth: {
    address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    referral: '0x01e8CEC73B020AB9f822fD0dee3Aa4da2fe39e38'
  },
  sep: {
    address: '0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af',
    referral: '0x8C28Cf33d9Fd3D0293f963b1cd27e3FF422B425c'
  }
};

const DEFAULT_FORM_STATE = {
  to: '',
  amount: '',
  value: '',
  token: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
    contractAddress: ETH_CONTRACT
  } as Token
};

const props = defineProps<{
  open: boolean;
  address: string;
  network: number;
  networkId: NetworkID;
  asset?: Token;
  initialState?: any;
}>();

const emit = defineEmits<{
  (e: 'add', transaction: Transaction);
  (e: 'close');
}>();

const form: {
  to: string;
  amount: string | number;
  value: string | number;
  token: Token;
} = reactive(clone(DEFAULT_FORM_STATE));

const formValid = computed(() => form.amount !== '');

function handleMaxClick() {
  handleAmountUpdate(
    formatUnits(props.asset?.tokenBalance || 0, DEFAULT_FORM_STATE.token.decimals)
  );
}

function handleAmountUpdate(value) {
  form.amount = value;
}

async function handleSubmit() {
  const tx = await createStakeTokenTransaction({
    token: form.token,
    form: clone({
      ...form,
      to: STAKING_CONTRACTS[props.networkId].address,
      args: { _referral: STAKING_CONTRACTS[props.networkId].referral }
    })
  });

  emit('add', tx);
  emit('close');
}

watch(
  () => props.open,
  () => {
    if (props.initialState) {
      form.to = props.initialState.recipient;
      form.token = props.initialState.token;
      handleAmountUpdate(props.initialState.amount);
    } else {
      form.to = DEFAULT_FORM_STATE.to;
      form.token = DEFAULT_FORM_STATE.token;
      handleAmountUpdate(DEFAULT_FORM_STATE.amount);
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Stake with Lido'" />
    </template>
    <div class="s-box p-4">
      <div class="relative w-full">
        <UiInputNumber
          :model-value="form.amount"
          :definition="{
            type: 'number',
            title: 'Stake',
            examples: ['0']
          }"
          @update:model-value="handleAmountUpdate"
        />
        <a
          class="absolute right-[16px] top-[4px]"
          href="#"
          @click.prevent="handleMaxClick"
          v-text="'max'"
        />
        <div class="absolute right-[16px] top-[26px] flex items-center">
          <UiStamp :id="ETH_CONTRACT" type="token" class="mr-2" :size="20" />
          ETH
        </div>
      </div>
      <div class="relative w-full">
        <UiInputNumber
          :model-value="form.amount"
          disabled
          :definition="{
            type: 'number',
            title: 'Receive',
            examples: ['0']
          }"
        />
        <div class="absolute right-[16px] top-[28px] flex items-center">
          <UiStamp
            :id="`${networkId}:${STAKING_CONTRACTS[networkId].address}`"
            type="token"
            class="mr-2"
            :size="20"
          />
          stETH
        </div>
      </div>
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit"> Confirm </UiButton>
    </template>
  </UiModal>
</template>
