import { BigNumber } from '@ethersproject/bignumber';
import Multicaller from '@/helpers/multicaller';
import { getProvider } from '@/helpers/provider';

export const SUPPORTED_NETWORKS = [1, 8453, 42161];

const ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function imageUrl() view returns (string)',
  'function metadata() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)'
];

export async function getMetadata(
  address: string,
  network: number
): Promise<Record<string, any>> {
  if (!SUPPORTED_NETWORKS.includes(network)) {
    throw new Error(`Network ${network} is not supported`);
  }

  const provider = getProvider(network);
  const multi = new Multicaller(String(network), provider, ABI);

  multi
    .call('name', address, 'name')
    .call('symbol', address, 'symbol')
    .call('imageUrl', address, 'imageUrl')
    .call('metadata', address, 'metadata')
    .call('decimals', address, 'decimals')
    .call('totalSupply', address, 'totalSupply');

  const result = await multi.execute();
  const metadata = JSON.parse(result.metadata || '{}');
  const socialMediaUrls = {};

  metadata.socialMediaUrls.forEach(
    (meta: { platform: string; url: string }) => {
      socialMediaUrls[meta.platform] = getHandle(meta.url, meta.platform);
    }
  );

  delete metadata.socialMediaUrls;

  return {
    name: result.name || '',
    symbol: result.symbol || '',
    imageUrl: result.imageUrl || '',
    decimals: result.decimals || 18,
    totalSupply: BigNumber.from(result.totalSupply || 0),
    ...metadata,
    ...socialMediaUrls
  };
}

function getHandle(url: string, platform: string): string {
  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      const match = url.match(/(?:twitter\.com|x\.com)\/(.+)/);
      return match?.[1] || '';
    case 'farcaster':
      return url.split('farcaster.xyz/')[1] || '';
    default:
      return url;
  }
}
