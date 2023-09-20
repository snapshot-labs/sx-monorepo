import { formatUnits } from '@ethersproject/units';
import { getBalances, GetBalancesResponse } from '@/helpers/alchemy';
import { METADATA } from '@/networks/evm';

const metadataByChainId = new Map(
  Object.entries(METADATA).map(([, metadata]) => [metadata.chainId, metadata])
);

export function useBalances() {
  const assets: Ref<GetBalancesResponse> = ref([]);
  const loading = ref(true);
  const loaded = ref(false);

  async function loadBalances(address: string, networkId: number) {
    const metadata = metadataByChainId.get(networkId);
    const baseToken = metadata?.ticker
      ? { name: metadata.name, symbol: metadata.ticker }
      : { name: 'Ethereum', symbol: 'ETH' };

    const data = await getBalances(address, networkId, baseToken);

    assets.value = data.filter(asset => formatUnits(asset.tokenBalance, asset.decimals) !== '0.0');
    loading.value = false;
    loaded.value = true;
  }

  const assetsMap = computed(
    () => new Map(assets.value.map(asset => [asset.contractAddress, asset]))
  );

  return { loading, loaded, assets, assetsMap, loadBalances };
}
