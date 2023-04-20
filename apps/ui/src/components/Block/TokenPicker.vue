<script setup lang="ts">
import { isAddress } from '@ethersproject/address';
import { formatUnits } from '@ethersproject/units';
import { abis } from '@/helpers/abis';
import { ETH_CONTRACT } from '@/helpers/constants';
import { _n, shorten } from '@/helpers/utils';
import { getProvider } from '@/helpers/provider';
import Multicaller from '@/helpers/multicaller';
import type { Token } from '@/helpers/alchemy';

const props = defineProps<{
  searchValue: string;
  loading: boolean;
  assets: Token[];
  address: string;
  network: number;
}>();

const emit = defineEmits<{
  (e: 'pick', value: string);
  (e: 'add', token: Token);
}>();

const customTokenLoading = ref(false);
const customToken: Ref<Token | null> = ref(null);
const isSearchValueValidToken: Ref<boolean> = ref(false);
const isSearchValueAddress = computed(() => isAddress(props.searchValue));

const filteredAssets = computed(() => {
  if (customToken.value) return [customToken.value];

  return props.assets
    .filter(asset => {
      return (
        asset.symbol.toLocaleLowerCase().includes(props.searchValue.toLocaleLowerCase()) ||
        asset.name.toLocaleLowerCase().includes(props.searchValue.toLocaleLowerCase()) ||
        asset.contractAddress.toLocaleLowerCase() === props.searchValue.toLocaleLowerCase()
      );
    })
    .sort((a, b) => {
      const isEth = (token: Token) => token.contractAddress === ETH_CONTRACT;
      if (isEth(a)) return -1;
      if (isEth(b)) return 1;
      return 0;
    });
});

function handlePick(token: Token) {
  if (token.contractAddress === customToken.value?.contractAddress) {
    emit('add', token);
  }

  emit('pick', token.contractAddress);
}

async function fetchCustomToken(address) {
  if (props.assets.find(asset => asset.contractAddress === address)) return;

  customTokenLoading.value = true;

  const network = props.network;
  const provider = getProvider(network);
  const tokens = [address];

  try {
    const multi = new Multicaller(network.toString(), provider, abis.erc20);
    tokens.forEach(token => {
      multi.call(`${token}.name`, token, 'name');
      multi.call(`${token}.symbol`, token, 'symbol');
      multi.call(`${token}.decimals`, token, 'decimals');
      multi.call(`${token}.balance`, token, 'balanceOf', [props.address]);
    });

    const result = await multi.execute();

    const fetchedToken = result[address];

    customToken.value = {
      logo: null,
      contractAddress: address,
      symbol: fetchedToken.symbol,
      name: fetchedToken.name,
      tokenBalance: fetchedToken.balance._hex,
      decimals: fetchedToken.decimals,
      price: 0,
      change: 0,
      value: 0
    };
    isSearchValueValidToken.value = true;
  } catch (e) {
    isSearchValueValidToken.value = false;
  } finally {
    customTokenLoading.value = false;
  }
}

watch(
  () => props.searchValue,
  value => {
    if (!isAddress(value)) {
      customToken.value = null;
      return;
    }

    fetchCustomToken(value);
  }
);
</script>

<template>
  <div v-if="loading || customTokenLoading" class="px-4 py-3 block flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div
      v-if="filteredAssets.length === 0 && (!isSearchValueAddress || !isSearchValueValidToken)"
      class="text-center py-3"
      v-text="'No results'"
    />
    <div
      v-for="(asset, i) in filteredAssets"
      :key="i"
      role="button"
      class="px-3 py-[12px] border-b last:border-0 flex justify-between"
      @click="handlePick(asset)"
    >
      <div class="flex items-center min-w-0 pr-2">
        <Stamp :id="asset.contractAddress" type="token" :size="32" />
        <div class="flex flex-col ml-3 leading-[20px] min-w-0">
          <div class="text-skin-link" v-text="shorten(asset.symbol, 12)" />
          <div class="text-sm truncate" v-text="shorten(asset.name, 24)" />
        </div>
      </div>
      <div class="flex flex-col items-end leading-[20px]">
        <div
          class="text-skin-link"
          v-text="_n(formatUnits(asset.tokenBalance || 0, asset.decimals || 0))"
        />
        <div class="text-sm" v-text="`$${_n(asset.price)}`" />
      </div>
    </div>
  </template>
</template>
