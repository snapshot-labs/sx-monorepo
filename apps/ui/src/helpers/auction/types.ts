import { GetAuctionPriceHourDataQuery, OrderFragment } from './gql/graphql';

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
export type AuctionPriceHistoryPoint =
  GetAuctionPriceHourDataQuery['priceData'][number];

export type VerificationProviderId = 'zkpassport' | 'sumsub';
export type AuctionVerificationType =
  | VerificationProviderId
  | 'public'
  | 'private';

export type VerificationStatus =
  | 'start'
  | 'loading'
  | 'pending'
  | 'scanning'
  | 'generating'
  | 'verified'
  | 'rejected'
  | 'error';

export const VERIFICATION_PENDING_STATUSES: readonly VerificationStatus[] = [
  'loading',
  'pending',
  'scanning',
  'generating'
];
