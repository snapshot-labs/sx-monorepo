const SUPPORTED_ABIS = ['erc721', 'erc1155'];
const OPENSEA_CHAINS: Record<number, string | undefined> = {
  5: 'goerli',
  11155111: 'sepolia'
  // mainnet networks require API token and api.opensea.io endpoint
  // 1: 'ethereum',
  // 137: 'matic',
  // 42161: 'arbitrum',
};

type ApiNft = {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: any;
  description: any;
  image_url: any;
  metadata_url: any;
  opensea_url: string;
  updated_at: string;
  is_disabled: boolean;
  is_nsfw: boolean;
};

export function useNfts() {
  const nfts: Ref<any[]> = ref([]);
  const loading = ref(true);
  const loaded = ref(false);

  async function loadNfts(address: string, chainId: number) {
    loading.value = true;

    const chain = OPENSEA_CHAINS[chainId];
    if (!chain) {
      console.error('Unsupported chain for OpenSea NFTs');
      loading.value = false;
      loaded.value = true;
    }

    const url = `https://testnets-api.opensea.io/api/v2/chain/${chain}/account/${address}/nfts`;
    const res = await fetch(url);
    const result = await res.json();

    nfts.value = (result.nfts as ApiNft[])
      .filter(asset => SUPPORTED_ABIS.includes(asset.token_standard))
      .map(asset => {
        const tokenId = asset.identifier;
        const title = asset.name ?? 'Untitled';
        const displayTitle = title.match(/(#[0-9]+)$/) || !tokenId ? title : `${title} #${tokenId}`;

        return {
          ...asset,
          type: asset.token_standard,
          tokenId,
          title,
          displayTitle,
          image: asset.image_url,
          collectionName: asset.collection,
          contractAddress: asset.contract
        };
      });
    loading.value = false;
    loaded.value = true;
  }

  const nftsMap = computed(() => new Map(nfts.value.map(asset => [asset.id, asset])));

  return { loading, loaded, nfts, nftsMap, loadNfts };
}
