<script setup>
import { onMounted, computed } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { useBalances } from '@/composables/useBalances';
import space from '@/helpers/space.json';
import { _n, shorten, explorerUrl } from '@/helpers/utils';

defineProps({ space: Object });

const { loading, assets, loadBalances } = useBalances();

const totalQuote = computed(() =>
  assets.value.reduce((acc, asset) => {
    return acc + asset.quote;
  }, 0)
);

onMounted(() => loadBalances(space.wallet));
</script>

<template>
  <Container slim class="space-y-3">
    <div class="x-block">
      <div class="border-b flex px-4 py-2">
        <h4>Wallet(s)</h4>
      </div>
      <a
        :href="explorerUrl('1', space.wallet)"
        target="_blank"
        class="flex justify-between items-center px-4 py-3 block"
      >
        <Stamp :id="space.wallet" type="avatar" :size="44" class="mr-2" />
        <div class="flex-1">
          <h4>
            {{ shorten(space.wallet) }}
          </h4>
          <div class="text-skin-text">${{ _n(totalQuote) }}</div>
        </div>
        <IH-external-link class="float-right mt-2" />
      </a>
    </div>
    <div class="x-block">
      <div class="border-b flex px-4 py-2">
        <h4>Asset(s)</h4>
      </div>
      <UiLoading v-if="loading" class="px-4 py-3 block" />
      <div
        v-for="(asset, i) in assets"
        :key="i"
        class="px-4 py-3 border-b last:border-0 flex"
      >
        <Stamp
          :id="asset.contract_address"
          type="token"
          :size="32"
          class="mr-3 mt-2"
        />
        <div class="flex-auto">
          <div class="leading-[24px]">
            <div class="text-md text-skin-link">
              {{
                _n(
                  formatUnits(asset.balance || 0, asset.contract_decimals || 0)
                )
              }}
              {{ asset.contract_ticker_symbol }}
            </div>
            <div>${{ _n(asset.quote) }}</div>
          </div>
        </div>
        <IH-arrow-sm-right class="mt-2" />
      </div>
    </div>
  </Container>
</template>
