<script setup lang="ts">
import { computed } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { ETH_CONTRACT } from '@/helpers/constants';
import { _n, shorten } from '@/helpers/utils';
import type { Token } from '@/helpers/alchemy';

const props = defineProps<{
  searchValue: string;
  loading: boolean;
  assets: Token[];
}>();

const emit = defineEmits<{
  (e: 'pick', value: string);
}>();

const filteredAssets = computed(() =>
  props.assets
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
    })
);
</script>

<template>
  <div v-if="loading" class="px-4 py-3 block flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div v-if="filteredAssets.length === 0" class="text-center py-3" v-text="'No results'" />
    <div
      v-for="(asset, i) in filteredAssets"
      :key="i"
      role="button"
      class="px-3 py-[12px] border-b last:border-0 flex justify-between"
      @click="emit('pick', asset.contractAddress)"
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
