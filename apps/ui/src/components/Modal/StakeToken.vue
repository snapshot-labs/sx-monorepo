<script setup lang="ts">
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { Token } from '@/helpers/alchemy';
import { ETH_CONTRACT } from '@/helpers/constants';
import { formatUnits, parseUnits } from '@ethersproject/units';
import { NetworkID, Transaction } from '@/types';
import { call } from '@/helpers/call';

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

const props = defineProps<{
  open: boolean;
  address: string;
  network: number;
  networkId: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'add', transaction: Transaction);
  (e: 'close');
}>();

const amount = ref<string>('');
const stakedAmount = ref<string>('');
const asset = ref<Token | undefined>();

const auth = getInstance();
const { assetsMap, loadBalances } = useBalances();
const { web3 } = useWeb3();

const formValid = computed(() => amount.value !== '');

function handleMaxClick() {
  if (!web3.value.account || !asset.value) return;

  handleValueUpdate(formatUnits(asset.value.tokenBalance, asset.value.decimals));
}

function handleValueUpdate(value) {
  amount.value = value;
  stakedAmount.value = value;
}

async function handleSubmit() {
  const tx = await call(
    auth.web3.getSigner(),
    ['function submit(address _referral) external payable returns (uint256)'],
    [
      STAKING_CONTRACTS[props.networkId].address,
      'submit',
      [STAKING_CONTRACTS[props.networkId].referral],
      { value: parseUnits(amount.value.toString(), asset.value!.decimals).toString() }
    ]
  );

  emit('add', tx);
  emit('close');
}

watch(
  () => web3.value.account,
  async account => {
    if (!account) return;

    await loadBalances(web3.value.account, props.network);
    asset.value = assetsMap.value.get(ETH_CONTRACT);
  },
  { immediate: true }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Stake lido'" />
    </template>
    <div class="s-box p-4">
      <div class="relative w-full">
        <UiInputNumber
          :model-value="amount"
          :definition="{
            type: 'number',
            title: 'Send',
            examples: ['0']
          }"
          @update:model-value="handleValueUpdate"
        />
        <a class="absolute right-[16px] top-[4px]" @click="handleMaxClick" v-text="'max'" />
        <div class="absolute right-[16px] top-[26px] flex items-center">
          <UiStamp :id="ETH_CONTRACT" type="token" class="mr-2" :size="20" />
          ETH
        </div>
      </div>
      <div class="relative w-full">
        <UiInputNumber
          :model-value="stakedAmount"
          disabled
          :definition="{
            type: 'number',
            title: 'Get',
            examples: ['0']
          }"
        />
        <div class="absolute right-[16px] top-[28px] flex items-center">
          <UiStamp
            :id="STAKING_CONTRACTS[networkId].address"
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
