import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  AuctionNetworkId,
  getAuctionPriceHistory,
  getAuctionPriceLevels,
  getAuctions,
  getOrders,
  getUnclaimedOrders,
  Order
} from '@/helpers/auction';
import {
  AuctionDetailFragment,
  Order_Filter,
  Order_OrderBy
} from '@/helpers/auction/gql/graphql';
import { ChartGranularity } from '@/helpers/charts';
import { getTokenPrices } from '@/helpers/coingecko';
import {
  CHAIN_IDS,
  COINGECKO_ASSET_PLATFORMS,
  ETH_CONTRACT
} from '@/helpers/constants';
import { formatAddress } from '@/helpers/utils';

const LIMIT = 20;
const SUMMARY_LIMIT = 5;
const ORDERS_LIMIT = 1000;
const PRICE_HISTORY_LIMIT = 1000;
const PRICE_LEVEL_LIMIT = 1000;

const TOKEN_PRICE_OVERRIDES = {
  // USDCTEST -> USDC
  '0xF7DcC8870b25B02e5AC5e9f3A43E44b2c27f9E38': {
    chainId: 1,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  // Mainnet WETH -> ETH
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
    chainId: 1,
    address: ETH_CONTRACT
  },
  // Sepolia WETH -> ETH
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': {
    chainId: 1,
    address: ETH_CONTRACT
  }
} as const;

export const AUCTION_KEYS = {
  all: ['auction'] as const,
  list: (network: MaybeRefOrGetter<AuctionNetworkId>) => [
    ...AUCTION_KEYS.all,
    network,
    'list'
  ],
  auction: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment | string>
  ) => [
    ...AUCTION_KEYS.all,
    network,
    () => {
      const auctionValue = toValue(auction);

      return typeof auctionValue === 'string' ? auctionValue : auctionValue.id;
    }
  ],
  orders: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>
  ) => [...AUCTION_KEYS.auction(network, auction), 'orders'],
  summary: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>,
    where?: MaybeRefOrGetter<Order_Filter>
  ) => [...AUCTION_KEYS.auction(network, auction), 'bidsSummary', { where }],
  unclaimedBids: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>,
    limit?: MaybeRefOrGetter<number>,
    where?: MaybeRefOrGetter<Order_Filter>
  ) => [
    ...AUCTION_KEYS.auction(network, auction),
    'unclaimedBids',
    { limit: limit ?? SUMMARY_LIMIT, where }
  ],
  biddingTokenPrice: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>
  ) => [
    ...AUCTION_KEYS.all,
    network,
    () => toValue(auction).id,
    'biddingTokenPrice'
  ],
  priceHistory: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>,
    granularity: MaybeRefOrGetter<ChartGranularity>
  ) => [...AUCTION_KEYS.auction(network, auction), 'priceHistory', granularity],
  priceLevel: (
    network: MaybeRefOrGetter<AuctionNetworkId>,
    auction: MaybeRefOrGetter<AuctionDetailFragment>
  ) => [...AUCTION_KEYS.auction(network, auction), 'priceLevel']
};

export function useAuctionsQuery({
  network
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: AUCTION_KEYS.list(network),
    queryFn: ({ pageParam }) =>
      getAuctions(toValue(network), {
        first: LIMIT,
        skip: pageParam
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < LIMIT) return null;

      return pages.length * LIMIT;
    }
  });
}

export function useBidsQuery({
  network,
  auction,
  enabled
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  enabled?: MaybeRefOrGetter<boolean>;
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
    },
    enabled
  });
}

export function useBidsSummaryQuery({
  network,
  auction,
  where,
  orderBy = 'timestamp',
  orderDirection = 'desc',
  enabled
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  where?: MaybeRefOrGetter<Order_Filter>;
  orderBy?: MaybeRefOrGetter<Order_OrderBy>;
  orderDirection?: MaybeRefOrGetter<'asc' | 'desc'>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: AUCTION_KEYS.summary(network, auction, where),
    queryFn: async () => {
      let orders: Order[] = [];
      let hasMore = true;

      while (hasMore) {
        const newOrders = await getOrders(
          toValue(auction).id,
          toValue(network),
          {
            first: ORDERS_LIMIT,
            skip: orders.length,
            orderBy: toValue(orderBy),
            orderDirection: toValue(orderDirection),
            orderFilter: toValue(where)
          }
        );

        orders = orders.concat(newOrders);
        hasMore = newOrders.length === ORDERS_LIMIT;
      }

      return orders;
    },
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

      let tokenAddress = formatAddress(auctionValue.addressBiddingToken);
      let chainId = CHAIN_IDS[networkValue];

      if (tokenAddress in TOKEN_PRICE_OVERRIDES) {
        const override =
          TOKEN_PRICE_OVERRIDES[
            tokenAddress as keyof typeof TOKEN_PRICE_OVERRIDES
          ];
        tokenAddress = override.address;
        chainId = override.chainId;
      }

      if (!(chainId in COINGECKO_ASSET_PLATFORMS)) {
        return 0;
      }

      const coingeckoAssetPlatform =
        COINGECKO_ASSET_PLATFORMS[
          chainId as keyof typeof COINGECKO_ASSET_PLATFORMS
        ];

      const coins = await getTokenPrices(coingeckoAssetPlatform, [
        tokenAddress
      ]);

      return coins[tokenAddress.toLowerCase()]?.usd ?? 0;
    }
  });
}

export function useAuctionPriceDataQuery({
  network,
  auction,
  start,
  granularity = 'hour'
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
  start: MaybeRefOrGetter<number>;
  granularity?: MaybeRefOrGetter<ChartGranularity>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: AUCTION_KEYS.priceHistory(network, auction, granularity),
    queryFn: async ({ pageParam }) => {
      return getAuctionPriceHistory(toValue(network), toValue(granularity), {
        skip: pageParam,
        first: PRICE_HISTORY_LIMIT,
        filter: {
          auction: toValue(auction).id,
          startTimestamp_gte: toValue(start)
        }
      });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PRICE_HISTORY_LIMIT) return null;

      return pages.length * PRICE_HISTORY_LIMIT;
    }
  });
}

export function useAuctionPriceLevelQuery({
  network,
  auction
}: {
  network: MaybeRefOrGetter<AuctionNetworkId>;
  auction: MaybeRefOrGetter<AuctionDetailFragment>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: AUCTION_KEYS.priceLevel(network, auction),
    queryFn: async ({ pageParam }) => {
      return getAuctionPriceLevels(toValue(network), {
        skip: pageParam,
        first: PRICE_LEVEL_LIMIT,
        filter: {
          auction: toValue(auction).id
        }
      });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PRICE_LEVEL_LIMIT) return null;

      return pages.length * PRICE_LEVEL_LIMIT;
    }
  });
}
