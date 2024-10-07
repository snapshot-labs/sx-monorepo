import { ChainId } from '@/types';

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

export const SUPPORTED_CHAIN_IDS = [
  1, // Ethereum,
  10, // Optimism,
  137, // Polygon,
  1329, // Sei
  8217, // Klaytn
  8453, // Base
  42161, // Arbitrum
  42170, // Arbitrum Nova
  43114, // Avalanche
  81457, // Blast
  11155111 // Sepolia
] as const;

const NETWORKS: Record<(typeof SUPPORTED_CHAIN_IDS)[number], ChainItem> = {
  1: { name: 'ethereum', isTestnet: false },
  10: { name: 'optimism', isTestnet: false },
  137: { name: 'matic', isTestnet: false },
  1329: { name: 'sei', isTestnet: false },
  8217: { name: 'klaytn', isTestnet: false },
  8453: { name: 'base', isTestnet: false },
  42161: { name: 'arbitrum', isTestnet: false },
  42170: { name: 'arbitrum_nova', isTestnet: false },
  43114: { name: 'avalanche', isTestnet: false },
  81457: { name: 'blast', isTestnet: false },
  11155111: { name: 'sepolia', isTestnet: true }
};

const SUPPORTED_ABIS = ['erc721', 'erc1155'];

export async function getNfts(
  address: string,
  chainId: ChainId
): Promise<ApiNft[]> {
  const network = NETWORKS[chainId];
  if (!network) throw new Error('Unsupported chain for OpenSea NFTs');
  const { name, isTestnet } = network;

  const endpoint = isTestnet
    ? 'https://testnets-api.opensea.io'
    : 'https://api.opensea.io';
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
      const displayTitle =
        title.match(/(#[0-9]+)$/) || !tokenId ? title : `${title} #${tokenId}`;

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
