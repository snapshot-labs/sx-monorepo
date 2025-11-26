import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { auctionQuery, ordersQuery } from './queries';
import { getNames } from '../stamp';
import { Order_OrderBy, OrderFragment } from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'sep';
export type Order = OrderFragment & { name: string | null };

const SUBGRAPH_URLS: Record<AuctionNetworkId, string> = {
  sep: 'https://subgrapher.snapshot.org/subgraph/arbitrum/Hs3FN65uB3kzSn1U5kPMrc1kHqaS9zQMM8BCVDwNf7Fn',
  eth: 'https://subgrapher.snapshot.org/subgraph/arbitrum/98f9T2v1KtNnZyexiEgNLMFnYkXdKoZq9Pt1EYQGq5aH'
};

export function formatPrice(
  price: string | number | undefined,
  fractionDigits = 8
) {
  const value = typeof price === 'number' ? price.toString() : price;

  return value
    ? parseFloat(value)
        .toFixed(fractionDigits)
        .replace(/\.?0+$/, '')
    : '0';
}

function getClient(network: AuctionNetworkId) {
  const subgraphUrl = SUBGRAPH_URLS[network];
  if (!subgraphUrl) throw new Error(`Unknown network: ${network}`);

  return new ApolloClient({
    uri: subgraphUrl,
    cache: new InMemoryCache()
  });
}

export async function getAuction(id: string, network: AuctionNetworkId) {
  const client = getClient(network);

  const { data } = await client.query({
    query: auctionQuery,
    variables: { id }
  });

  const auctionDetail = data?.auctionDetail;

  if (!auctionDetail) return null;

  return { auctionDetail };
}

export async function getOrders(
  id: string,
  network: AuctionNetworkId,
  {
    skip = 0,
    first = 20,
    orderBy = 'price',
    orderDirection = 'desc'
  }: {
    skip?: number;
    first?: number;
    orderBy?: Order_OrderBy;
    orderDirection?: 'desc' | 'asc';
  } = {}
): Promise<Order[]> {
  const client = getClient(network);

  const { data } = await client.query({
    query: ordersQuery,
    variables: { id, skip, first, orderBy, orderDirection }
  });

  const orders = data.auctionDetail?.orders ?? [];

  const names = await getNames(orders.map(order => order.userAddress));

  return orders.map(order => ({
    ...order,
    name: names[order.userAddress.toLocaleLowerCase()] || null
  }));
}
