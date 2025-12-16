import { ETH_CONTRACT } from './constants';

const COINGECKO_API_KEY = 'CG-o41PzYqjLPSWSJdMEyDELEpB';
const COINGECKO_API_URL = 'https://pro-api.coingecko.com/api/v3/simple';
const COINGECKO_PARAMS = '&vs_currencies=usd&include_24hr_change=true';

async function callCoinGecko(apiUrl: string) {
  const res = await fetch(apiUrl);
  return res.json();
}

export async function getTokenPrices(
  assetPlatform: string,
  contractAddresses: string[]
): Promise<
  Record<string, { usd: number; usd_24h_change: number } | undefined>
> {
  return callCoinGecko(
    `${COINGECKO_API_URL}/token_price/${assetPlatform}?contract_addresses=${contractAddresses
      .slice(0, 100)
      .join(',')}${COINGECKO_PARAMS}&x_cg_pro_api_key=${COINGECKO_API_KEY}`
  );
}

export async function getCoins(
  assetPlatform: string,
  baseToken: string,
  contractAddresses: string[]
) {
  const [baseTokenData, tokenData] = await Promise.all([
    callCoinGecko(
      `${COINGECKO_API_URL}/price?ids=${baseToken}${COINGECKO_PARAMS}&x_cg_pro_api_key=${COINGECKO_API_KEY}`
    ),
    getTokenPrices(assetPlatform, contractAddresses)
  ]);

  return {
    [ETH_CONTRACT]: baseTokenData[baseToken],
    ...tokenData
  };
}
