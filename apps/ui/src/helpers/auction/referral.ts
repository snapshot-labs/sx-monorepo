import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';

export const POSTER_TAG = 'brokester/1';
export const CHAIN_ID = 11155111;
export const AUCTION_TAG = 'token/1';

export const EIP712_DOMAIN = {
  name: 'brokester',
  version: '0.1',
  chainId: CHAIN_ID,
  verifyingContract: '0x000000000000cd17345801aa8147b8D3950260FF'
};

export type Referral = {
  id: string;
  tag: string;
  referral: string;
  referee: string;
  created: number;
};

export type Referee = {
  id: string;
  tag: string;
  referee: string;
  referral_count: number;
};

const client = new ApolloClient({
  uri: import.meta.env.VITE_BROKESTER_API_URL ?? 'http://localhost:3000',
  cache: new InMemoryCache()
});

const REFEREES_QUERY = gql`
  query Referees($tag: String!, $first: Int!, $skip: Int!) {
    referees(
      where: { tag: $tag }
      first: $first
      skip: $skip
      orderBy: referral_count
      orderDirection: desc
    ) {
      id
      tag
      referee
      referral_count
    }
  }
`;

const USER_REFERRAL_QUERY = gql`
  query UserReferral($id: String!) {
    referral(id: $id) {
      id
      tag
      referral
      referee
      created
    }
  }
`;

export async function getReferees(
  tag: string,
  options: { first?: number; skip?: number } = {}
): Promise<Referee[]> {
  const { first = 20, skip = 0 } = options;

  const { data } = await client.query({
    query: REFEREES_QUERY,
    variables: { tag, first, skip }
  });

  return data?.referees ?? [];
}

export async function getUserReferral(
  tag: string,
  referral: string
): Promise<Referral | null> {
  const id = `${tag}/${referral.toLowerCase()}`;

  const { data } = await client.query({
    query: USER_REFERRAL_QUERY,
    variables: { id }
  });

  return data?.referral ?? null;
}
