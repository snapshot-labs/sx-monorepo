import { OrderFragment } from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'sep';
export type Order = OrderFragment & { name: string | null };
