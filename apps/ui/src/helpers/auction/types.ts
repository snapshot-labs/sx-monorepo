import { GetAuctionPriceHourDataQuery, OrderFragment } from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'base' | 'sep';
export type AuctionState =
  | 'active'
  | 'finalizing'
  | 'claiming'
  | 'claimed'
  | 'canceled';

export type Order = OrderFragment & { name: string | null };
export type SellOrder = { buyAmount: bigint; sellAmount: bigint };
export type AuctionPriceLevelPoint = {
  volume: string;
  price: string;
};
export type AuctionPriceHistoryPoint =
  GetAuctionPriceHourDataQuery['priceData'][number];
