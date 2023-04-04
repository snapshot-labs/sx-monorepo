import { formatUnits } from '@ethersproject/units';
import { getBalances, GetBalancesResponse } from '@/helpers/alchemy';

export function useBalances() {
  const assets: Ref<GetBalancesResponse> = ref([]);
  const loading = ref(true);
  const loaded = ref(false);

  async function loadBalances(address: string, networkId: number) {
    const data = await getBalances(address, networkId);

    assets.value = data.filter(asset => formatUnits(asset.tokenBalance, asset.decimals) !== '0.0');
    loading.value = false;
    loaded.value = true;
  }

  const assetsMap = computed(
    () => new Map(assets.value.map(asset => [asset.contractAddress, asset]))
  );

  return { loading, loaded, assets, assetsMap, loadBalances };
}
