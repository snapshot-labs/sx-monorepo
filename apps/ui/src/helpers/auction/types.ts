import {
  GetAuctionPriceHourDataQuery,
  GetAuctionPriceLevelsQuery,
  OrderFragment
} from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'base' | 'sep';
export type AuctionState =
  | 'upcoming'
  | 'active'
  | 'finalizing'
  | 'claiming'
  | 'claimed'
  | 'canceled';

export type Order = OrderFragment & { name: string | null };
export type SellOrder = { buyAmount: bigint; sellAmount: bigint };
export type AuctionPriceLevelPoint =
  GetAuctionPriceLevelsQuery['auctionPriceLevels'][number];
export type AuctionPriceHistoryPoint =
  GetAuctionPriceHourDataQuery['priceData'][number];
