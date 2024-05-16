<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { ETH_CONTRACT } from '@/helpers/constants';
import { clone } from '@/helpers/utils';
import { createStakeTokenTransaction } from '@/helpers/transactions';
import { NetworkID, Transaction } from '@/types';

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
  amount: ''
};

const props = defineProps<{
  open: boolean;
  address: string;
  network: number;
  networkId: NetworkID;
  initialState?: any;
}>();

const emit = defineEmits<{
  (e: 'add', transaction: Transaction);
  (e: 'close');
}>();

const form: {
  to: string;
  amount: string | number;
} = reactive(clone(DEFAULT_FORM_STATE));

const { assetsMap, loadBalances } = useBalances();

const formValid = computed(() => form.amount !== '');

const token = computed(() => {
  let token = assetsMap.value?.get(ETH_CONTRACT);

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

const stakingContract = computed(() => STAKING_CONTRACTS[props.networkId]);

function handleMaxClick() {
  handleAmountUpdate(formatUnits(token.value.tokenBalance, token.value.decimals));
}

function handleAmountUpdate(value) {
  form.amount = value;
}

async function handleSubmit() {
  const tx = await createStakeTokenTransaction({
    form: clone({
      ...form,
      to: stakingContract.value.address,
      args: { referral: stakingContract.value.referral }
    })
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
    if (props.initialState) {
      form.to = props.initialState.recipient;
      handleAmountUpdate(props.initialState.amount);
    } else {
      form.to = stakingContract.value?.address || DEFAULT_FORM_STATE.to;
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
      <div v-if="!stakingContract">
        <UiAlert type="error">
          <span>
            The token <b>{{ token.symbol }}</b> can not be staked with Lido
          </span>
        </UiAlert>
      </div>
      <template v-else>
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
          <a class="absolute right-[16px] top-[4px]" href="#" @click.prevent="handleMaxClick">
            max
          </a>
          <div class="absolute right-[16px] top-[26px] flex items-center gap-x-2">
            <UiStamp :id="token.contractAddress" type="token" :size="20" />
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
          <div class="absolute right-[16px] top-[28px] flex items-center gap-x-2">
            <UiStamp :id="`${networkId}:${stakingContract.address}`" type="token" :size="20" />
            stETH
          </div>
        </div>
      </template>
    </div>
    <template v-if="stakingContract" #footer>
      <UiButton class="w-full" :disabled="!formValid" @click="handleSubmit"> Confirm </UiButton>
    </template>
  </UiModal>
</template>
