import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { AuctionDetailFragment } from './gql/graphql';
import { auctionQuery } from './queries';

export type AuctionNetworkId = 'eth' | 'sep';

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

export async function getAuction(
  id: string,
  network: AuctionNetworkId
): Promise<{ auctionDetail: AuctionDetailFragment } | null> {
  const subgraphUrl = SUBGRAPH_URLS[network];
  if (!subgraphUrl) throw new Error(`Unknown network: ${network}`);

  const client = new ApolloClient({
    uri: subgraphUrl,
    cache: new InMemoryCache()
  });

  const { data } = await client.query({
    query: auctionQuery,
    variables: { id }
  });

  const auctionDetail = data?.auctionDetail;

  if (!auctionDetail) return null;

  return { auctionDetail };
}
