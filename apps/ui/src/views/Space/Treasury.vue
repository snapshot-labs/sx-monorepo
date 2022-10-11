<script setup>
import { onMounted, computed } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { useBalances } from '@/composables/useBalances';
import space from '@/helpers/space.json';
import { _n, shorten, explorerUrl } from '@/helpers/utils';
import { ETH_CONTRACT } from '@/helpers/constants';

defineProps({ space: Object });

const { loading, loaded, assets, loadBalances } = useBalances();

const totalQuote = computed(() =>
  assets.value.reduce((acc, asset) => {
    return acc + asset.quote;
  }, 0)
);

const sortedAssets = computed(() =>
  (assets || []).value.sort((a, b) => {
    const isEth = asset => asset.contract_address === ETH_CONTRACT;
    if (isEth(a)) return -1;
    if (isEth(b)) return 1;
    return 0;
  })
);

onMounted(() => loadBalances(space.wallet));
</script>

<template>
  <div class="p-4 space-x-2 flex">
    <div class="flex-auto" />
    <a>
      <UiButton class="!px-0 w-[46px]">
        <IH-duplicate class="inline-block" />
      </UiButton>
    </a>
    <router-link :to="{ name: 'editor' }">
      <UiButton class="!px-0 w-[46px]">
        <IH-arrow-sm-right class="inline-block -rotate-45" />
      </UiButton>
    </router-link>
  </div>
  <div class="space-y-3">
    <div>
      <Label :label="'Treasury'" />
      <a
        :href="explorerUrl('1', space.wallet)"
        target="_blank"
        class="flex justify-between items-center mx-4 py-3 block border-b"
      >
        <Stamp :id="space.wallet" type="avatar" :size="32" class="mr-3" />
        <div class="flex-1 leading-[22px]">
          <h4 class="text-skin-link" v-text="shorten(space.wallet)" />
          <div class="text-skin-text text-sm" v-text="shorten(space.wallet)" />
        </div>
        <h3 v-text="`$${_n(totalQuote.toFixed())}`" />
      </a>
    </div>
    <div>
      <Label :label="'Tokens'" />
      <UiLoading v-if="loading && !loaded" class="px-4 py-3 block" />
      <div
        v-for="(asset, i) in sortedAssets"
        :key="i"
        class="mx-4 py-3 border-b flex"
      >
        <div class="flex-auto flex items-center">
          <Stamp :id="asset.contract_address" type="token" :size="32" />
          <div class="flex flex-col ml-3 leading-[22px]">
            <h4
              class="text-skin-link"
              v-text="shorten(asset.contract_ticker_symbol, 12)"
            />
            <div class="text-sm" v-text="shorten(asset.contract_name, 24)" />
          </div>
        </div>
        <div
          v-if="asset.quote_rate"
          class="flex-col items-end text-right leading-[22px] w-[180px] invisible md:visible"
        >
          <h4 class="text-skin-link" v-text="`$${_n(asset.quote_rate)}`" />
          <div v-if="asset.percent" class="text-sm">
            <div
              v-if="asset.percent > 0"
              class="text-green"
              v-text="`+${_n(asset.percent)}%`"
            />
            <div
              v-if="asset.percent < 0"
              class="text-red"
              v-text="`${_n(asset.percent)}%`"
            />
          </div>
        </div>
        <div
          class="flex-col items-end text-right leading-[22px] w-auto md:w-[180px]"
        >
          <h4
            class="text-skin-link"
            v-text="
              _n(formatUnits(asset.balance || 0, asset.contract_decimals || 0))
            "
          />
          <div
            v-if="asset.quote"
            class="text-sm"
            v-text="`$${_n(asset.quote)}`"
          />
        </div>
      </div>
    </div>
  </div>
</template>
