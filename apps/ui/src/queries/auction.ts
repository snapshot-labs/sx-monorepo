import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { AuctionNetworkId, getOrders } from '@/helpers/auction';
import {
  AuctionDetailFragment,
  Order_Filter
} from '@/helpers/auction/gql/graphql';
import { getTokenPrices } from '@/helpers/coingecko';
import { CHAIN_IDS, COINGECKO_ASSET_PLATFORMS } from '@/helpers/constants';

const LIMIT = 20;

export function useBidsQuery({
  network,
  auction
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['auction', network, () => toValue(auction).id, 'orders'],
    queryFn: ({ pageParam }) =>
      getOrders(toValue(auction).id, toValue(network), {
        first: LIMIT,
        skip: pageParam
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < LIMIT) return null;

      return pages.length * LIMIT;
    }
  });
}

export function useBidsSummaryQuery({
  network,
  auction,
  limit = 5,
  where,
  enabled
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  limit?: MaybeRefOrGetter<number>;
  where?: MaybeRefOrGetter<Order_Filter>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: [
      'auction',
      network,
      () => toValue(auction).id,
      'bidsSummary',
      { limit, where }
    ],
    queryFn: () =>
      getOrders(toValue(auction).id, toValue(network), {
        first: toValue(limit),
        orderBy: 'timestamp',
        orderDirection: 'desc',
        orderFilter: toValue(where)
      }),
    enabled
  });
}

export function useBiddingTokenPriceQuery({
  network,
  auction
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
}) {
  return useQuery({
    queryKey: [
      'auction',
      network,
      () => toValue(auction).id,
      'biddingTokenPrice'
    ],
    queryFn: async () => {
      const networkValue = toValue(network);
      const auctionValue = toValue(auction);

      const chainId = CHAIN_IDS[networkValue];
      if (!(chainId in COINGECKO_ASSET_PLATFORMS)) {
        return 0;
      }

      const coingeckoAssetPlatform =
        COINGECKO_ASSET_PLATFORMS[
          chainId as keyof typeof COINGECKO_ASSET_PLATFORMS
        ];

      const coins = await getTokenPrices(coingeckoAssetPlatform, [
        auctionValue.addressBiddingToken
      ]);

      return (
        coins[auctionValue.addressBiddingToken.toLocaleLowerCase()]?.usd ?? 0
      );
    }
  });
}
