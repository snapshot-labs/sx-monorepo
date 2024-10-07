import { formatUnits } from '@ethersproject/units';
import { getBalances, GetBalancesResponse } from '@/helpers/alchemy';
import {
  COINGECKO_ASSET_PLATFORMS,
  COINGECKO_BASE_ASSETS,
  ETH_CONTRACT
} from '@/helpers/constants';
import { METADATA } from '@/networks/evm';
import { ChainId } from '@/types';

const COINGECKO_API_KEY = 'CG-1z19sMoCC6LoqR4b6avyLi3U';
const COINGECKO_API_URL = 'https://pro-api.coingecko.com/api/v3/simple';
const COINGECKO_PARAMS = '&vs_currencies=usd&include_24hr_change=true';

export const METADATA_BY_CHAIN_ID = new Map(
  Object.entries(METADATA).map(([, metadata]) => [
    metadata.chainId as ChainId,
    metadata
  ])
);

export function useBalances() {
  const assets: Ref<GetBalancesResponse> = ref([]);
  const loading = ref(true);
  const loaded = ref(false);

  async function callCoinGecko(apiUrl: string) {
    const res = await fetch(apiUrl);
    return res.json();
  }

  async function getCoins(
    assetPlatform: string,
    baseToken: string,
    contractAddresses: string[]
  ) {
    const [baseTokenData, tokenData] = await Promise.all([
      callCoinGecko(
        `${COINGECKO_API_URL}/price?ids=${baseToken}${COINGECKO_PARAMS}&x_cg_pro_api_key=${COINGECKO_API_KEY}`
      ),
      callCoinGecko(
        `${COINGECKO_API_URL}/token_price/${assetPlatform}?contract_addresses=${contractAddresses
          .slice(0, 100)
          .join(',')}${COINGECKO_PARAMS}&x_cg_pro_api_key=${COINGECKO_API_KEY}`
      )
    ]);

    return {
      [ETH_CONTRACT]: baseTokenData[baseToken],
      ...tokenData
    };
  }

  async function loadBalances(address: string, chainId: ChainId) {
    const metadata = METADATA_BY_CHAIN_ID.get(chainId);
    const baseToken = metadata?.ticker
      ? { name: metadata.name, symbol: metadata.ticker }
      : { name: 'Ether', symbol: 'ETH' };

    const data = await getBalances(address, chainId, baseToken);
    const tokensWithBalance = data.filter(
      asset =>
        formatUnits(asset.tokenBalance, asset.decimals) !== '0.0' ||
        asset.symbol === baseToken.symbol
    );

    const coingeckoAssetPlatform = COINGECKO_ASSET_PLATFORMS[chainId];
    const coingeckoBaseAsset = COINGECKO_BASE_ASSETS[chainId];

    const coins =
      coingeckoBaseAsset && coingeckoAssetPlatform
        ? await getCoins(
            coingeckoAssetPlatform,
            coingeckoBaseAsset,
            tokensWithBalance
              .filter(asset => asset.contractAddress !== ETH_CONTRACT)
              .map(token => token.contractAddress)
          )
        : [];

    assets.value = tokensWithBalance
      .map(asset => {
        if (!coins[asset.contractAddress]) return asset;

        const price = coins[asset.contractAddress]?.usd || 0;
        const change = coins[asset.contractAddress]?.usd_24h_change || 0;
        const value =
          parseFloat(formatUnits(asset.tokenBalance, asset.decimals)) * price;

        return {
          ...asset,
          price,
          change,
          value
        };
      })
      .sort((a, b) => b.value - a.value);

    loading.value = false;
    loaded.value = true;
  }

  const assetsMap = computed(
    () => new Map(assets.value.map(asset => [asset.contractAddress, asset]))
  );

  return { loading, loaded, assets, assetsMap, loadBalances };
}
