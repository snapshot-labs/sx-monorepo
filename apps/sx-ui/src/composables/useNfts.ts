const SUPPORTED_ABIS = ['ERC721', 'ERC1155'];

export function useNfts() {
  const nfts: Ref<any[]> = ref([]);
  const loading = ref(true);
  const loaded = ref(false);

  async function loadNfts(address) {
    loading.value = true;

    const url = `https://testnets-api.opensea.io/api/v1/assets?owner=${address}&order_direction=desc&offset=0&limit=20&include_orders=false`;
    const res = await fetch(url);
    const { assets } = await res.json();

    nfts.value = assets
      .filter(asset => SUPPORTED_ABIS.includes(asset.asset_contract?.schema_name))
      .map(asset => {
        const tokenId = asset.token_id;
        const title = asset.name ?? 'Untitled';
        const displayTitle = title.match(/(#[0-9]+)$/) || !tokenId ? title : `${title} #${tokenId}`;

        return {
          ...asset,
          type: asset.asset_contract.schema_name.toLowerCase(),
          tokenId,
          title,
          displayTitle,
          image: asset.image_url,
          collectionName: asset.collection.name,
          contractAddress: asset.asset_contract.address
        };
      });
    loading.value = false;
    loaded.value = true;
  }

  const nftsMap = computed(() => new Map(nfts.value.map(asset => [asset.id, asset])));

  return { loading, loaded, nfts, nftsMap, loadNfts };
}
