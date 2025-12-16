import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import {
  RefereesDocument,
  RefereesQuery,
  UserReferralDocument,
  UserReferralQuery
} from './gql/graphql';

export const POSTER_TAG = 'brokester/1';
export const REFERRAL_CHAIN_ID = 11155111;
export const AUCTION_TAG = 'token/1';

export const REFERRAL_EIP712_DOMAIN = {
  name: 'brokester',
  version: '0.1',
  chainId: REFERRAL_CHAIN_ID,
  verifyingContract: '0x000000000000cd17345801aa8147b8D3950260FF'
};

export const REFERRAL_EIP712_TYPES = {
  SetAuctionReferee: [
    { name: 'auction_tag', type: 'string' },
    { name: 'referee', type: 'address' }
  ]
};

export type Referee = RefereesQuery['referees'][number];
export type Referral = NonNullable<UserReferralQuery['referral']>;

const client = new ApolloClient({
  uri: import.meta.env.VITE_BROKESTER_API_URL || 'https://api.brokester.box',
  cache: new InMemoryCache()
});

export async function getReferees(
  tag: string,
  options: { first?: number; skip?: number } = {}
): Promise<Referee[]> {
  const { first = 20, skip = 0 } = options;

  const { data } = await client.query({
    query: RefereesDocument,
    variables: { tag, first, skip },
    fetchPolicy: 'network-only'
  });

  return data?.referees ?? [];
}

export async function getUserReferral(
  tag: string,
  referral: string
): Promise<Referral | null> {
  const id = `${tag}/${referral.toLowerCase()}`;

  const { data } = await client.query({
    query: UserReferralDocument,
    variables: { id },
    fetchPolicy: 'network-only'
  });

  return data?.referral ?? null;
}
