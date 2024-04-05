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

type ChainItem = {
  name: string;
  isTestnet: boolean;
};

const SUPPORTED_ABIS = ['erc721', 'erc1155'];
const OPENSEA_CHAINS: Record<number, ChainItem> = {
  5: { name: 'goerli', isTestnet: true },
  11155111: { name: 'sepolia', isTestnet: true },
  1: { name: 'ethereum', isTestnet: false },
  10: { name: 'optimism', isTestnet: false },
  137: { name: 'matic', isTestnet: false },
  42161: { name: 'arbitrum', isTestnet: false }
};

export async function getNfts(address: string, chainId: number): Promise<ApiNft[]> {
  const chain = OPENSEA_CHAINS[chainId];
  if (!chain) throw new Error('Unsupported chain for OpenSea NFTs');

  const { name, isTestnet } = chain;

  const endpoint = isTestnet ? 'https://testnets-api.opensea.io' : 'https://api.opensea.io';
  const url = `${endpoint}/api/v2/chain/${name}/account/${address}/nfts`;

  const res = await fetch(url, {
    headers: {
      'x-api-key': import.meta.env.VITE_OPENSEA_API_KEY
    }
  });

  const result = await res.json();

  return result.nfts
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
}
