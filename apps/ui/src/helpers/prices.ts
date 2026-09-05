import { ETH_CONTRACT } from './constants';

type PriceInfo = { usd: number; usd_24h_change: number };

const API_URL = 'https://coins.llama.fi';
const MAX_COINS_PER_REQUEST = 200;
const MAX_COINS_STRING_LENGTH = 8000;

const CHAINS: Record<string, { chain: string; native: string }> = {
  1: { chain: 'ethereum', native: 'coingecko:ethereum' },
  10: { chain: 'optimism', native: 'coingecko:ethereum' },
  56: { chain: 'bsc', native: 'coingecko:binancecoin' },
  100: { chain: 'xdai', native: 'coingecko:xdai' },
  137: { chain: 'polygon', native: 'coingecko:polygon-ecosystem-token' },
  5000: { chain: 'mantle', native: 'coingecko:mantle' },
  8453: { chain: 'base', native: 'coingecko:ethereum' },
  42161: { chain: 'arbitrum', native: 'coingecko:ethereum' },
  33139: { chain: 'apechain', native: 'coingecko:apecoin' },
  33111: { chain: 'apechain', native: 'coingecko:apecoin' }
};

async function fetchCoins(path: string): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${API_URL}/${path}`);
    return (await res.json()).coins ?? {};
  } catch {
    return {};
  }
}

function batchAddresses(
  addresses: string[],
  coinId: (address: string) => string
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];

  for (const address of addresses) {
    const candidate = [...current, address];
    const overLimit =
      candidate.length > MAX_COINS_PER_REQUEST ||
      candidate.map(coinId).join(',').length > MAX_COINS_STRING_LENGTH;

    if (overLimit && current.length > 0) {
      batches.push(current);
      current = [address];
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) batches.push(current);

  return batches;
}

async function getTokenPricesBatch(
  addresses: string[],
  coinId: (address: string) => string
): Promise<Record<string, PriceInfo | undefined>> {
  const coins = addresses.map(coinId).join(',');

  const [prices, changes] = await Promise.all([
    fetchCoins(`prices/current/${coins}`),
    fetchCoins(`percentage/${coins}`)
  ]);

  return Object.fromEntries(
    addresses
      .filter(address => prices[coinId(address)])
      .map(address => [
        address,
        {
          usd: prices[coinId(address)].price,
          usd_24h_change: changes[coinId(address)] ?? 0
        }
      ])
  );
}

export async function getTokenPrices(
  chainId: string,
  contractAddresses: string[]
): Promise<Record<string, PriceInfo | undefined>> {
  const config = CHAINS[chainId];
  if (!config) return {};

  const coinId = (address: string) =>
    address === ETH_CONTRACT ? config.native : `${config.chain}:${address}`;
  const batches = batchAddresses(contractAddresses, coinId);

  const results = await Promise.all(
    batches.map(addresses => getTokenPricesBatch(addresses, coinId))
  );

  return Object.assign({}, ...results);
}
