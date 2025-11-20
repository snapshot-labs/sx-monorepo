import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { AuctionDetailFragment } from './gql/graphql';
import { auctionQuery } from './queries';

const SUBGRAPH_URLS = {
  sep: 'https://subgrapher.snapshot.org/subgraph/arbitrum/Hs3FN65uB3kzSn1U5kPMrc1kHqaS9zQMM8BCVDwNf7Fn',
  eth: 'https://subgrapher.snapshot.org/subgraph/arbitrum/98f9T2v1KtNnZyexiEgNLMFnYkXdKoZq9Pt1EYQGq5aH'
} as const;

export async function getAuction(
  id: string,
  network: string
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
