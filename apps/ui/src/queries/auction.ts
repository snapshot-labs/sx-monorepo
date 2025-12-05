import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  AuctionNetworkId,
  getAuctionPriceHistory,
  getOrders,
  getUnclaimedOrders
} from '@/helpers/auction';
import {
  AuctionDetailFragment,
  Order_Filter,
  Order_OrderBy
} from '@/helpers/auction/gql/graphql';
import { getTokenPrices } from '@/helpers/coingecko';
import { CHAIN_IDS, COINGECKO_ASSET_PLATFORMS } from '@/helpers/constants';

const LIMIT = 20;
const SUMMARY_LIMIT = 5;

export const AUCTION_KEYS = {
  all: ['auction'] as const,
  auction: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>
  ) => [AUCTION_KEYS.all, network, () => toValue(auction).id],
  orders: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>
  ) => [AUCTION_KEYS.auction(network, auction), 'orders'],
  summary: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>,
    limit?: MaybeRefOrGetter<number>,
    where?: MaybeRefOrGetter<Order_Filter>
  ) => [
    AUCTION_KEYS.auction(network, auction),
    'bidsSummary',
    { limit: limit ?? SUMMARY_LIMIT, where }
  ],
  unclaimedBids: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>,
    limit?: MaybeRefOrGetter<number>,
    where?: MaybeRefOrGetter<Order_Filter>
  ) => [
    AUCTION_KEYS.auction(network, auction),
    'unclaimedBids',
    { limit: limit ?? SUMMARY_LIMIT, where }
  ],
  biddingTokenPrice: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>
  ) => [
    AUCTION_KEYS.all,
    network,
    () => toValue(auction).id,
    'biddingTokenPrice'
  ],
  priceHistory: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>,
    granularity: MaybeRefOrGetter<'minute' | 'hour'>
  ) => [...AUCTION_KEYS.auction(network, auction), 'priceHistory', granularity]
};

export function useBidsQuery({
  network,
  auction
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: AUCTION_KEYS.orders(network, auction),
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
  limit = SUMMARY_LIMIT,
  where,
  orderBy = 'timestamp',
  orderDirection = 'desc',
  enabled
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  limit?: MaybeRefOrGetter<number>;
  where?: MaybeRefOrGetter<Order_Filter>;
  orderBy?: MaybeRefOrGetter<Order_OrderBy>;
  orderDirection?: MaybeRefOrGetter<'asc' | 'desc'>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: AUCTION_KEYS.summary(network, auction, limit, where),
    queryFn: () =>
      getOrders(toValue(auction).id, toValue(network), {
        first: toValue(limit),
        orderBy: toValue(orderBy),
        orderDirection: toValue(orderDirection),
        orderFilter: toValue(where)
      }),
    enabled
  });
}

export function useUnclaimedOrdersQuery({
  network,
  auction,
  limit = 100,
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
    queryKey: AUCTION_KEYS.unclaimedBids(network, auction, limit, where),
    queryFn: () =>
      getUnclaimedOrders(toValue(auction).id, toValue(network), {
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
    queryKey: AUCTION_KEYS.biddingTokenPrice(network, auction),
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

      return coins[auctionValue.addressBiddingToken.toLowerCase()]?.usd ?? 0;
    }
  });
}

export function useAuctionPriceDataQuery({
  network,
  auction,
  granularity = 'hour'
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  granularity?: MaybeRefOrGetter<'minute' | 'hour'>;
}) {
  const pageLimit = 1000;

  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: AUCTION_KEYS.priceHistory(network, auction, granularity),
    queryFn: async ({ pageParam }) => {
      const auctionValue = toValue(auction);
      const networkValue = toValue(network);
      const granularityValue = toValue(granularity);

      return getAuctionPriceHistory(
        auctionValue.id,
        networkValue,
        granularityValue,
        { skip: pageParam, first: pageLimit }
      );
    },
    getNextPageParam: (lastPage, pages) => {
      if (!Array.isArray(lastPage) || lastPage.length < pageLimit) return null;
      return pages.length * pageLimit;
    },
    enabled: computed(() => {
      const auctionValue = toValue(auction);
      const networkValue = toValue(network);
      return !!(auctionValue?.id && networkValue);
    })
  });
}
