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
  ]
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
  enabled
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  limit?: MaybeRefOrGetter<number>;
  where?: MaybeRefOrGetter<Order_Filter>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: AUCTION_KEYS.summary(network, auction, limit, where),
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

      return coins[auctionValue.addressBiddingToken.toLowerCase()]?.usd ?? 0;
    }
  });
}
