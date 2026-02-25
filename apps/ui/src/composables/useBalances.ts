import { formatUnits } from '@ethersproject/units';
import { skipToken, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getBalances, Token } from '@/helpers/alchemy';
import { getTokenPrices } from '@/helpers/coingecko';
import { COINGECKO_ASSET_PLATFORMS, ETH_CONTRACT } from '@/helpers/constants';
import { METADATA } from '@/networks/evm';
import { ChainId } from '@/types';

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

METADATA_BY_CHAIN_ID.set(42220, {
  name: 'Celo',
  ticker: 'CELO'
});

type Treasury = {
  chainId: string;
  address: string;
};

export function useBalances({
  treasury
}: {
  treasury: MaybeRefOrGetter<Treasury | null>;
}) {
  async function loadBalances(address: string, chainId: string) {
    const metadata = METADATA_BY_CHAIN_ID.get(chainId);
    const baseToken = metadata?.ticker
      ? { name: metadata.name, symbol: metadata.ticker }
      : { name: 'Ether', symbol: 'ETH' };

    const data = await getBalances(address, chainId, baseToken);
    const tokensWithBalance = data.filter(
      asset =>
        formatUnits(asset.tokenBalance, asset.decimals) !== '0.0' ||
        asset.contractAddress === ETH_CONTRACT
    );

    const coingeckoAssetPlatform = COINGECKO_ASSET_PLATFORMS[chainId];

    const coins = coingeckoAssetPlatform
      ? await getTokenPrices(
          coingeckoAssetPlatform,
          tokensWithBalance.map(token => token.contractAddress)
        )
      : {};

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
