import {
  COINGECKO_ASSET_PLATFORMS,
  COINGECKO_BASE_ASSETS,
  ETH_CONTRACT
} from './constants';

type AssetPlatforms = typeof COINGECKO_ASSET_PLATFORMS;
type AssetPlatform = AssetPlatforms[keyof AssetPlatforms];
type PriceInfo = { usd: number; usd_24h_change: number };

const COINGECKO_API_KEY = 'CG-o41PzYqjLPSWSJdMEyDELEpB';
const COINGECKO_API_URL = 'https://pro-api.coingecko.com/api/v3/simple';
const COINGECKO_PARAMS = '&vs_currencies=usd&include_24hr_change=true';

async function callCoinGecko(apiUrl: string) {
  const res = await fetch(apiUrl);
  return res.json();
}

export async function getTokenPrices(
  assetPlatform: AssetPlatform,
  contractAddresses: string[]
) {
  const baseAsset = COINGECKO_BASE_ASSETS[assetPlatform];
  const tokenAddresses = contractAddresses.filter(
    address => address !== ETH_CONTRACT
  );

  const tokensCall: Promise<Record<string, PriceInfo | undefined>> =
    callCoinGecko(
      `${COINGECKO_API_URL}/token_price/${assetPlatform}?contract_addresses=${tokenAddresses
        .slice(0, 100)
        .join(',')}${COINGECKO_PARAMS}&x_cg_pro_api_key=${COINGECKO_API_KEY}`
    );

  let baseTokenCall: Promise<{
    [baseAsset]: PriceInfo;
  }> | null = null;
  if (contractAddresses.includes(ETH_CONTRACT)) {
    baseTokenCall = callCoinGecko(
      `${COINGECKO_API_URL}/price?ids=${baseAsset}${COINGECKO_PARAMS}&x_cg_pro_api_key=${COINGECKO_API_KEY}`
    );
  }

  const [data, baseTokenData] = await Promise.all([tokensCall, baseTokenCall]);

  if (baseTokenData) {
    return {
      ...data,
      [ETH_CONTRACT]: baseTokenData[COINGECKO_BASE_ASSETS[assetPlatform]]
    };
  }

  return data;
}
