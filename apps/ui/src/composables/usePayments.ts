import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';
import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';

const SCHNAPS_GRAPHQL_URL = 'https://schnaps.snapshot.box/graphql';

export type Payment = {
  id: string;
  space: string;
  amount_decimal: string;
  block: number;
  token_symbol: string;
  token_address: string;
  timestamp?: number;
};

const PAYMENT_QUERY = gql`
  query Payments($space: String!) {
    payments(where: { space: $space }) {
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

async function fetchPayments(spaceId: string): Promise<Payment[]> {
  const client = new ApolloClient({
    uri: SCHNAPS_GRAPHQL_URL,
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
    query: PAYMENT_QUERY,
    variables: {
      space: spaceId
    }
  });

  if (errors?.length) {
    throw new Error(errors.map(e => e.message).join(', '));
  }

  const payments = (data?.payments || []) as Payment[];

  // Sort by timestamp descending (most recent first)
  return payments.sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeB - timeA;
  });
}

export function usePayments(spaceId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['payments', { spaceId: () => toValue(spaceId) }],
    queryFn: () => fetchPayments(toValue(spaceId))
  });
}
