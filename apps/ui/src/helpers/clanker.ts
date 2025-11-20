import Multicaller from '@/helpers/multicaller';
import { getProvider } from '@/helpers/provider';

export const SUPPORTED_NETWORKS = [1, 8453, 42161];

const MAX_TWITTER_HANDLE_LENGTH = 15;
const MAX_FARCASTER_HANDLE_LENGTH = 256;
const MAX_URL_LENGTH = 256;
const TWITTER_HANDLE_REGEX = new RegExp(
  `(?:(?:twitter|x)\\.com)\\/([a-zA-Z0-9_]{1,${MAX_TWITTER_HANDLE_LENGTH}})`
);

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
  const socialMediaUrls: Record<string, string> = {};

  if (!result.symbol) {
    throw new Error('Invalid Clanker token data');
  }

  metadata.socialMediaUrls?.forEach(
    (meta: { platform: string; url: string }) => {
      const handle = getHandle(meta.url, meta.platform);
      if (handle) {
        socialMediaUrls[meta.platform] = handle;
      }
    }
  );

  delete metadata.socialMediaUrls;

  return {
    name: result.name || '',
    symbol: result.symbol || '',
    imageUrl: result.imageUrl || '',
    decimals: result.decimals || 18,
    totalSupply: BigInt(result.totalSupply || 0),
    ...metadata,
    ...socialMediaUrls
  };
}

function getHandle(url: string, platform: string): string {
  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x': {
      const match = url.match(TWITTER_HANDLE_REGEX);
      return match?.[1] || '';
    }
    case 'farcaster': {
      const handle = url.split('farcaster.xyz/').pop();
      if (handle && handle.length <= MAX_FARCASTER_HANDLE_LENGTH) {
        return handle;
      }
      return '';
    }
    case 'website': {
      try {
        new URL(url);
        return url.length <= MAX_URL_LENGTH ? url : '';
      } catch {
        return '';
      }
    }
    default: {
      return '';
    }
  }
}
