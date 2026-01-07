import { OrderFragment } from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'base' | 'sep';
export type Order = OrderFragment & { name: string | null };
export type SellOrder = {
  buyAmount: bigint;
  sellAmount: bigint;
  attestation?: `0x${string}`;
};
export type AuctionPriceHistoryPoint = {
  startTimestamp: string;
  close: string;
};

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
