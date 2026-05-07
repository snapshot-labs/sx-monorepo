import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { NetworkID } from '@/types';
import {
  PartnerStatisticsDocument,
  UserInviteDocument,
  UserInviteQuery,
  UserInvitesDocument
} from './gql/graphql';

export const REFERRAL_SHARE = 0.05;
export const POSTER_TAG = 'brokester/1';
export const DEFAULT_AUCTION_TAG = 'token-1';

export const EIP712_DOMAIN = {
  name: 'brokester',
  version: '0.1',
  verifyingContract: '0x000000000000cd17345801aa8147b8D3950260FF'
};

export const SET_PARTNER_EIP712_TYPES = {
  SetAuctionPartner: [
    { name: 'auction_tag', type: 'string' },
    { name: 'partner', type: 'address' }
  ]
};

export type Invite = NonNullable<UserInviteQuery['invite']>;

const client = new ApolloClient({
  uri: import.meta.env.VITE_BROKESTER_API_URL || 'https://api.brokester.box',
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache'
    }
  }
});

export async function getPartnerStatistics(
  networkId: NetworkID,
  tag: string,
  options: { first?: number; skip?: number } = {}
) {
  const { first = 20, skip = 0 } = options;

  const { data } = await client.query({
    query: PartnerStatisticsDocument,
    variables: { indexer: networkId, tag, first, skip }
  });

  return data.partnerstatistics;
}

export async function getUserInvite(
  networkId: NetworkID,
  tag: string,
  buyer: string
) {
  const id = `${tag}/${buyer.toLowerCase()}`;

  const { data } = await client.query({
    query: UserInviteDocument,
    variables: { indexer: networkId, id }
  });

  return data.invite;
}

export async function getUserInvites(
  networkId: NetworkID,
  tag: string,
  partner: string,
  options: { first?: number; skip?: number } = {}
) {
  const { first = 1000, skip = 0 } = options;

  const { data } = await client.query({
    query: UserInvitesDocument,
    variables: {
      indexer: networkId,
      tag,
      partner: partner.toLowerCase(),
      first,
      skip
    }
  });

  return data.invites;
}
