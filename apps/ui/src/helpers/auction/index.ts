import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import {
  auctionPriceHourDataQuery,
  auctionPriceMinuteDataQuery,
  auctionQuery,
  ordersQuery,
  previousOrderQuery,
  unclaimedOrdersQuery
} from './queries';
import { getNames } from '../stamp';
import {
  AuctionPriceHourData_Filter,
  AuctionPriceMinuteData_Filter,
  Order_Filter,
  Order_OrderBy,
  OrderFragment
} from './gql/graphql';
import { encodeOrder } from './orders';
import { AuctionNetworkId, AuctionPriceHistoryPoint, Order } from './types';
import { ChartGranularity } from '../charts';

export * from './types';

const DEFAULT_ORDER_ID =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

const SUBGRAPH_URLS: Record<AuctionNetworkId, string> = {
  sep: 'https://subgrapher.snapshot.org/subgraph/arbitrum/6EcQPEFwfCiAq45qUKk4Wnajp5vCUFuxq4r5xSBiya1d',
  eth: 'https://subgrapher.snapshot.org/subgraph/arbitrum/E6VviPcyLR1i77VUeyt8dRUbxWPCeMbEgJgBGX5QthnR'
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
    orderDirection = 'desc',
    orderFilter
  }: {
    skip?: number;
    first?: number;
    orderBy?: Order_OrderBy;
    orderDirection?: 'desc' | 'asc';
    orderFilter?: Order_Filter;
  } = {}
): Promise<Order[]> {
  const client = getClient(network);

  const { data } = await client.query({
    query: ordersQuery,
    variables: { id, skip, first, orderBy, orderDirection, orderFilter }
  });

  const orders = data.auctionDetail?.orders ?? [];

  const names = await getNames(orders.map(order => order.userAddress));

  return orders.map(order => ({
    ...order,
    name: names[order.userAddress.toLowerCase()] || null
  }));
}

export async function getPreviousOrderId(
  id: string,
  network: AuctionNetworkId,
  price: string
): Promise<string> {
  const client = getClient(network);

  const { data, error } = await client.query({
    query: previousOrderQuery,
    variables: { id, price }
  });

  if (error) throw error;

  const orders: OrderFragment[] =
    data.auctionDetail?.ordersWithoutClaimed || [];

  if (!orders.length) return DEFAULT_ORDER_ID;

  const sortedOrders: OrderFragment[] = [...orders].sort((a, b) => {
    const aPrice = Number(a.price);
    const bPrice = Number(b.price);

    if (aPrice === bPrice) {
      return Number(a.volume) - Number(b.volume);
    }

    return aPrice - bPrice;
  });

  return encodeOrder({
    userId: BigInt(sortedOrders[0].userId),
    buyAmount: BigInt(sortedOrders[0].buyAmount),
    sellAmount: BigInt(sortedOrders[0].sellAmount)
  });
}

export async function getUnclaimedOrders(
  id: string,
  network: AuctionNetworkId,
  {
    orderFilter
  }: {
    orderFilter?: Order_Filter;
  } = {}
): Promise<Set<string>> {
  const client = getClient(network);

  const { data } = await client.query({
    query: unclaimedOrdersQuery,
    variables: { id, orderFilter }
  });

  return new Set(
    data.auctionDetail?.ordersWithoutClaimed?.map(order => order.id) ?? []
  );
}

export async function getAuctionPriceHistory(
  network: AuctionNetworkId,
  granularity: ChartGranularity,
  {
    skip = 0,
    first = 1000,
    filter
  }: {
    skip?: number;
    first?: number;
    filter?: AuctionPriceHourData_Filter | AuctionPriceMinuteData_Filter;
  } = {}
): Promise<AuctionPriceHistoryPoint[]> {
  const client = getClient(network);

  const query =
    granularity === 'hour'
      ? auctionPriceHourDataQuery
      : auctionPriceMinuteDataQuery;
  const dataKey =
    granularity === 'hour'
      ? 'auctionPriceHourDatas'
      : 'auctionPriceMinuteDatas';

  const { data } = await client.query({
    query,
    variables: { where: filter, first, skip }
  });

  return data[dataKey] || [];
}
