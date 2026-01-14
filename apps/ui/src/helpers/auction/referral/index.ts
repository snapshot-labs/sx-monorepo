import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { NetworkID } from '@/types';
import {
  RefereesDocument,
  RefereesQuery,
  UserRefereesDocument,
  UserReferralDocument,
  UserReferralQuery
} from './gql/graphql';

export const REFERRAL_SHARE = 0.05;
export const POSTER_TAG = 'brokester/1';
export const AUCTION_TAG = 'token/1';

export const REFERRAL_EIP712_DOMAIN = {
  name: 'brokester',
  version: '0.1',
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
  networkId: NetworkID,
  tag: string,
  options: { first?: number; skip?: number } = {}
): Promise<Referee[]> {
  const { first = 20, skip = 0 } = options;

  const { data } = await client.query({
    query: RefereesDocument,
    variables: { indexer: networkId, tag, first, skip },
    fetchPolicy: 'no-cache'
  });

  return data.referees;
}

export async function getUserReferral(
  networkId: NetworkID,
  tag: string,
  referral: string
): Promise<Referral | null> {
  const id = `${tag}/${referral.toLowerCase()}`;

  const { data } = await client.query({
    query: UserReferralDocument,
    variables: { indexer: networkId, id },
    fetchPolicy: 'no-cache'
  });

  return data.referral;
}

export async function getUserReferees(
  networkId: NetworkID,
  tag: string,
  referee: string,
  options: { first?: number; skip?: number } = {}
): Promise<Referral[]> {
  const { first = 1000, skip = 0 } = options;

  const { data } = await client.query({
    query: UserRefereesDocument,
    variables: {
      indexer: networkId,
      tag,
      referee: referee.toLowerCase(),
      first,
      skip
    },
    fetchPolicy: 'no-cache'
  });

  return data.referrals;
}
