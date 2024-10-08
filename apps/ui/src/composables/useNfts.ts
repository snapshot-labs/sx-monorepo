import { getNfts } from '@/helpers/opensea';
import { ChainId } from '@/types';

export function useNfts() {
  const nfts: Ref<any[]> = ref([]);
  const loading = ref(true);
  const loaded = ref(false);

  async function loadNfts(address: string, chainId: ChainId) {
    loading.value = true;

    nfts.value = await getNfts(address, chainId);
    loading.value = false;
    loaded.value = true;
  }

  const nftsMap = computed(
    () => new Map(nfts.value.map(asset => [asset.id, asset]))
  );

  return { loading, loaded, nfts, nftsMap, loadNfts };
}
