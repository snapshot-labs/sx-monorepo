<script setup>
import { onMounted, ref } from 'vue';
import snapshot from '@snapshot-labs/snapshot.js';
import { formatUnits } from '@ethersproject/units';
import spaces from '@/helpers/spaces.json';
import { _n, shorten, explorerUrl } from '@/helpers/utils';

defineProps({ space: Object });

const assets = ref([]);
const loading = ref(false);

onMounted(async () => {
  const treasury = spaces.pasta.wallets[0];
  loading.value = true;
  const key = 'ckey_2d082caf47f04a46947f4f212a8';
  const url = `https://api.covalenthq.com/v1/1/address/${treasury}/balances_v2/?quote-currency=USD&format=JSON&nft=false&no-nft-fetch=true&key=${key}`;
  const results = await snapshot.utils.getJSON(url);
  const ether = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const etherItem = results.data.items.find(
    item => item.contract_address === ether
  );
  assets.value = [
    etherItem,
    ...results.data.items.filter(
      item =>
        formatUnits(item.balance || 0, item.contract_decimals || 0) > 0.001 &&
        item.contract_address !== ether
    )
  ];
  loading.value = false;
});
</script>

<template>
  <Container slim class="space-y-3">
    <div class="x-block">
      <div class="border-b flex px-4 py-2">
        <h4>Wallet(s)</h4>
      </div>
      <a
        :href="explorerUrl('1', spaces.pasta.wallets[0])"
        target="_blank"
        class="px-4 py-3 block"
      >
        <h4>
          <Stamp
            type="avatar"
            :id="spaces.pasta.wallets[0]"
            :size="44"
            class="mr-2"
          />
          {{ shorten(spaces.pasta.wallets[0]) }}
          <IH-external-link class="float-right mt-2" />
        </h4>
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
          type="token"
          :id="asset.contract_address"
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
