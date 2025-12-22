import { OrderFragment } from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'base' | 'sep';
export type Order = OrderFragment & { name: string | null };
export type SellOrder = { buyAmount: bigint; sellAmount: bigint };
export type AuctionPriceHistoryPoint = {
  startTimestamp: string;
  close: string;
};
export type AuctionPriceLevelPoint = {
  volume: string;
  price: string;
};
