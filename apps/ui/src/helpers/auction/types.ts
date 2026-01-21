import {
  GetAuctionPriceHourDataQuery,
  GetAuctionPriceLevelsQuery,
  OrderFragment
} from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'base' | 'sep';
export type AuctionState =
  | 'active'
  | 'finalizing'
  | 'claiming'
  | 'claimed'
  | 'canceled';

export type Order = OrderFragment & { name: string | null };
export type SellOrder = {
  buyAmount: bigint;
  sellAmount: bigint;
  attestation?: `0x${string}`;
};
export type AuctionPriceLevelPoint =
  GetAuctionPriceLevelsQuery['auctionPriceLevels'][number];
export type AuctionPriceHistoryPoint =
  GetAuctionPriceHourDataQuery['priceData'][number];

export type VerificationProviderId = 'zkpassport' | 'sumsub';

export type AuctionVerificationType =
  | VerificationProviderId
  | 'public'
  | 'private';

export type VerificationStatus =
  | 'started'
  | 'loading'
  | 'pending'
  | 'scanning'
  | 'generating'
  | 'verified'
  | 'rejected'
  | 'error';
