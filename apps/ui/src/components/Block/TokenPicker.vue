<script setup>
import { computed } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { ETH_CONTRACT } from '@/helpers/constants';
import { _n, shorten } from '@/helpers/utils';

const props = defineProps({
  searchValue: String,
  loading: Boolean,
  assets: Array
});

const emit = defineEmits(['pick']);

const filteredAssets = computed(() =>
  props.assets
    .filter(asset => {
      return (
        asset.contract_ticker_symbol
          .toLocaleLowerCase()
          .includes(props.searchValue.toLocaleLowerCase()) ||
        asset.contract_name
          .toLocaleLowerCase()
          .includes(props.searchValue.toLocaleLowerCase())
      );
    })
    .sort((a, b) => {
      const isEth = asset => asset.contract_address === ETH_CONTRACT;
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
    <div
      v-if="filteredAssets.length === 0"
      v-text="'No results'"
      class="text-center py-3"
    />
    <div
      v-for="(asset, i) in filteredAssets"
      :key="i"
      role="button"
      class="px-3 py-[12px] border-b last:border-0 flex justify-between"
      @click="emit('pick', asset.contract_address)"
    >
      <div class="flex items-center">
        <Stamp type="token" :id="asset.contract_address" :size="32" />
        <div class="flex flex-col ml-3 leading-[20px]">
          <div
            v-text="shorten(asset.contract_ticker_symbol, 12)"
            class="text-skin-link"
          />
          <div v-text="shorten(asset.contract_name, 24)" class="text-sm" />
        </div>
      </div>
      <div class="flex flex-col items-end leading-[20px]">
        <div
          v-text="
            _n(formatUnits(asset.balance || 0, asset.contract_decimals || 0))
          "
          class="text-skin-link"
        />
        <div v-text="`$${_n(asset.quote)}`" class="text-sm" />
      </div>
    </div>
  </template>
</template>
