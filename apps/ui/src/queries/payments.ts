import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { useInfiniteQuery } from '@tanstack/vue-query';
import gql from 'graphql-tag';
import { MaybeRefOrGetter, toValue } from 'vue';

const SCHNAPS_URLS: Record<string, string> = {
  s: 'https://schnaps.snapshot.box/graphql',
  's-tn': 'https://testnet-schnaps.snapshot.box/graphql'
};

const PAYMENTS_LIMIT = 20;
const RETRY_COUNT = 3;

export type Payment = {
  id: string;
  space: string;
  amount_decimal: string;
  token_symbol: string;
  timestamp?: number;
  type: string;
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
      token_symbol
      timestamp
      type
    }
  }
`;

async function fetchPayments(
  spaceId: string,
  network: string,
  skip: number
): Promise<Payment[]> {
  const uri = SCHNAPS_URLS[network] || SCHNAPS_URLS.s;

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

export function usePaymentsQuery(
  spaceId: MaybeRefOrGetter<string>,
  network: MaybeRefOrGetter<string>
) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['payments', { spaceId, network }],
    queryFn: ({ pageParam }) =>
      fetchPayments(toValue(spaceId), toValue(network), pageParam),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAYMENTS_LIMIT) return null;

      return pages.length * PAYMENTS_LIMIT;
    },
    retry: (failureCount, error) => {
      if (error?.message.includes('Row not found')) return false;

      return failureCount < RETRY_COUNT;
    }
  });
}
