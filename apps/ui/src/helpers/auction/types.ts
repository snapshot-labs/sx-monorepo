import { OrderFragment } from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'sep';
export type Order = OrderFragment & { name: string | null };
export type SellOrder = { buyAmount: bigint; sellAmount: bigint };
export type AuctionPriceHistoryData = {
  startTimestamp: string;
  close: string;
};
