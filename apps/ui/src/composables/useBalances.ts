import { formatUnits } from '@ethersproject/units';
import { skipToken, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getBalances, Token } from '@/helpers/alchemy';
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

type Metadata = {
  name: string;
  ticker?: string;
};

export const METADATA_BY_CHAIN_ID = new Map<ChainId, Metadata>(
  Object.entries(METADATA).map(([, metadata]) => [
    metadata.chainId as ChainId,
    metadata
  ])
);

METADATA_BY_CHAIN_ID.set(100, {
  name: 'Gnosis Chain',
  ticker: 'XDAI'
});

type Treasury = {
  chainId: ChainId;
  address: string;
};

export function useBalances({
  treasury
}: {
  treasury: MaybeRefOrGetter<Treasury | null>;
}) {
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

    const data = await getBalances(address, chainId.toString(), baseToken);
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

    return tokensWithBalance
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
      .sort((a, b) => {
        const isEth = (token: Token) => token.contractAddress === ETH_CONTRACT;
        if (isEth(a)) return -1;
        if (isEth(b)) return 1;

        return b.value - a.value;
      });
  }

  const queryFn = computed(() => {
    const treasuryValue = toValue(treasury);

    if (!treasuryValue) return skipToken;

    return () => loadBalances(treasuryValue.address, treasuryValue.chainId);
  });

  const { data, isPending, isSuccess, isError } = useQuery({
    queryKey: ['balances', treasury],
    queryFn: queryFn,
    staleTime: 5 * 60 * 1000
  });

  const assets = computed(() => data.value ?? []);

  const assetsMap = computed(
    () => new Map(data.value?.map(asset => [asset.contractAddress, asset]))
  );

  return { isPending, isSuccess, isError, assets, assetsMap };
}
