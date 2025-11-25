import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { BigNumber } from '@ethersproject/bignumber';
import { auctionQuery, ordersQuery, previousOrderQuery } from './queries';
import { getNames } from '../stamp';
import {
  AuctionDetailFragment,
  Order_OrderBy,
  OrderFragment
} from './gql/graphql';

export type AuctionNetworkId = 'eth' | 'sep';
export type Order = OrderFragment & { name: string | null };
export type SellOrder = { sellAmount: number; price: number };

export type Auction = {
  id: string;
  network: AuctionNetworkId;
} & AuctionDetailFragment;

const SUBGRAPH_URLS: Record<AuctionNetworkId, string> = {
  sep: 'https://subgrapher.snapshot.org/subgraph/arbitrum/Hs3FN65uB3kzSn1U5kPMrc1kHqaS9zQMM8BCVDwNf7Fn',
  eth: 'https://subgrapher.snapshot.org/subgraph/arbitrum/98f9T2v1KtNnZyexiEgNLMFnYkXdKoZq9Pt1EYQGq5aH'
};

export const AUCTION_CONTRACT_ADDRESSES: Record<AuctionNetworkId, string> = {
  sep: '0x231F3Fd7c3E3C9a2c8A03B72132c31241DF0a26C',
  eth: '0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101'
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

export async function getPreviousOrder(
  id: string,
  network: AuctionNetworkId,
  price: number
): Promise<string> {
  const client = getClient(network);

  const { data } = await client.query({
    query: previousOrderQuery,
    variables: { id, price: price.toString() }
  });

  const orders: OrderFragment[] =
    data.auctionDetail?.ordersWithoutClaimed || [];

  if (!orders.length) {
    return '0x0000000000000000000000000000000000000000000000000000000000000001';
  }

  const sortedOrders: OrderFragment[] = [...orders].sort((a, b) => {
    if (Number(a.price) === Number(b.price))
      return Number(a.volume) - Number(b.volume);
    return Number(a.price) - Number(b.price);
  });

  return encodeOrder({
    userId: BigNumber.from(sortedOrders[0].userId),
    buyAmount: BigNumber.from(sortedOrders[0].buyAmount),
    sellAmount: BigNumber.from(sortedOrders[0].sellAmount)
  });
}

export function encodeOrder(order: {
  sellAmount: BigNumber;
  buyAmount: BigNumber;
  userId: BigNumber;
}): string {
  return `0x${order.userId
    .toHexString()
    .slice(2)
    .padStart(16, '0')}${order.buyAmount
    .toHexString()
    .slice(2)
    .padStart(
      24,
      '0'
    )}${order.sellAmount.toHexString().slice(2).padStart(24, '0')}`;
}
