import { ETH_CONTRACT } from './constants';

type PriceInfo = { usd: number; usd_24h_change: number };

const API_URL = 'https://coins.llama.fi';
const MAX_COINS_PER_REQUEST = 200;

// DefiLlama chain slug and native asset coin id, by chain id
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

async function getTokenPricesBatch(
  config: { chain: string; native: string },
  addresses: string[]
): Promise<Record<string, PriceInfo | undefined>> {
  const coinId = (address: string) =>
    address === ETH_CONTRACT ? config.native : `${config.chain}:${address}`;
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

  const batches: string[][] = [];
  for (let i = 0; i < contractAddresses.length; i += MAX_COINS_PER_REQUEST) {
    batches.push(contractAddresses.slice(i, i + MAX_COINS_PER_REQUEST));
  }

  const results = await Promise.all(
    batches.map(addresses => getTokenPricesBatch(config, addresses))
  );

  return Object.assign({}, ...results);
}
