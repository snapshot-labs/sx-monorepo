import { ref, computed, Ref } from 'vue';
import snapshot from '@snapshot-labs/snapshot.js';
import { formatUnits } from '@ethersproject/units';
import { ETH_CONTRACT } from '@/helpers/constants';

const assets: Ref<any[]> = ref([]);
const loading = ref(true);
const loaded = ref(false);

export function useBalances() {
  async function loadBalances(address, network) {
    loading.value = true;
    const key = 'ckey_2d082caf47f04a46947f4f212a8';
    const url = `https://api.covalenthq.com/v1/${network}/address/${address}/balances_v2/?quote-currency=USD&format=JSON&nft=false&no-nft-fetch=true&key=${key}`;
    const results = await snapshot.utils.getJSON(url);
    const etherItem = results.data.items.find(
      item => item.contract_address === ETH_CONTRACT
    );
    assets.value = [
      etherItem,
      ...results.data.items.filter(
        item =>
          parseFloat(
            formatUnits(item.balance || 0, item.contract_decimals || 0)
          ) > 0.001 && item.contract_address !== ETH_CONTRACT
      )
    ]
      .sort((a, b) => b.quote - a.quote)
      .map(asset => {
        if (asset.quote_rate && asset.quote_rate_24h)
          asset.percent =
            (100 / asset.quote_rate) *
            (asset.quote_rate - asset.quote_rate_24h);
        return asset;
      });
    loading.value = false;
    loaded.value = true;
  }

  const assetsMap = computed(
    () => new Map(assets.value.map(asset => [asset.contract_address, asset]))
  );

  return { loading, loaded, assets, assetsMap, loadBalances };
}
