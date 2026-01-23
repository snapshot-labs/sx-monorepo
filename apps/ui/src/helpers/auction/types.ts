import {
  AuctionDetailFragment,
  GetAuctionPriceHourDataQuery,
  GetAuctionPriceLevelsQuery,
  OrderFragment
} from './gql/graphql';

export type AuctionWithMetadata = AuctionDetailFragment & {
  network: AuctionNetworkId;
  imageUrl?: string;
  soldSupplyPercentage: number;
  referralId: string;
};
export type AuctionNetworkId = 'eth' | 'base' | 'sep';
export type AuctionState =
  | 'upcoming'
  | 'active'
  | 'finalizing'
  | 'claiming'
  | 'claimed'
  | 'canceled';

export type Order = OrderFragment & { name: string | null };
export type SellOrder = {
  buyAmount: bigint;
  sellAmount: bigint;
  auction: AuctionDetailFragment;
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
