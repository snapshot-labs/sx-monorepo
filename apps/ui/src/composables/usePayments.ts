import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import gql from 'graphql-tag';

const SCHNAPS_URLS: Record<string, string> = {
  s: 'https://schnaps.snapshot.box/graphql',
  's-tn': 'https://testnet-schnaps.snapshot.box/graphql'
} as const;

export const PAYMENTS_LIMIT = 20;

export type Payment = {
  id: string;
  space: string;
  amount_decimal: string;
  block: number;
  token_symbol: string;
  token_address: string;
  timestamp?: number;
};

const PAYMENTS_QUERY = gql`
  query Payments($space: String!, $first: Int!, $skip: Int!) {
    payments(
      where: { space: $space }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      space
      amount_decimal
      block
      token_symbol
      token_address
      timestamp
    }
  }
`;

export async function fetchPayments(
  spaceId: string,
  network: string,
  skip: number
): Promise<Payment[]> {
  const uri =
    SCHNAPS_URLS[network as keyof typeof SCHNAPS_URLS] || SCHNAPS_URLS.s;

  const client = new ApolloClient({
    uri,
    cache: new InMemoryCache({
      addTypename: false
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache'
      }
    }
  });

  const { data, errors } = await client.query({
    query: PAYMENTS_QUERY,
    variables: {
      space: `${network}:${spaceId}`,
      first: PAYMENTS_LIMIT,
      skip
    }
  });

  if (errors?.length) {
    throw new Error(errors.map(e => e.message).join(', '));
  }

  return (data?.payments || []) as Payment[];
}
