<script setup>
import { computed } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { _n } from '@/helpers/utils';

const props = defineProps({
  searchValue: String,
  loading: Boolean,
  assets: Array
});

const emit = defineEmits(['pick']);

const filteredAssets = computed(() =>
  props.assets.filter(asset => {
    return (
      asset.contract_ticker_symbol
        .toLocaleLowerCase()
        .includes(props.searchValue.toLocaleLowerCase()) ||
      asset.contract_name
        .toLocaleLowerCase()
        .includes(props.searchValue.toLocaleLowerCase())
    );
  })
);
</script>

<template>
  <div v-if="loading" class="px-4 py-3 block flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div v-if="filteredAssets.length === 0" class="text-center py-2">
      No results
    </div>
    <div
      v-for="(asset, i) in filteredAssets"
      :key="i"
      role="button"
      class="px-3 py-1 border-b last:border-0 flex justify-between"
      @click="emit('pick', asset.contract_address)"
    >
      <div class="flex items-center">
        <Stamp type="token" :id="asset.contract_address" :size="32" />
        <div class="flex flex-col ml-3 leading-[20px] text-skin-link text-sm">
          <span>
            {{ asset.contract_ticker_symbol }}
          </span>
          <span>{{ asset.contract_name }}</span>
        </div>
      </div>
      <div class="flex flex-col items-end text-sm">
        <span class="text-skin-link">
          {{
            _n(formatUnits(asset.balance || 0, asset.contract_decimals || 0))
          }}
        </span>
        <span>${{ _n(asset.quote) }}</span>
      </div>
    </div>
  </template>
</template>
