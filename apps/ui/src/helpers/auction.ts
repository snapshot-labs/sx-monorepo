import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';

type AuctionSubgraph = {
  addressAuctioningToken: string;
  addressBiddingToken: string;
  symbolAuctioningToken: string;
  symbolBiddingToken: string;
  decimalsAuctioningToken: string;
  decimalsBiddingToken: string;
  orderCancellationEndDate: string;
  endTimeTimestamp: string;
  startingTimeStamp: string;
  minimumBiddingAmountPerOrder: string;
  minFundingThreshold: string;
  currentClearingPrice: string;
  isAtomicClosureAllowed: boolean;
  isPrivateAuction: boolean;
  allowListSigner: string;
  exactOrder: { sellAmount: string; price: string };
};

const SUBGRAPH_URLS = {
  sep: 'https://subgrapher.snapshot.org/subgraph/arbitrum/Hs3FN65uB3kzSn1U5kPMrc1kHqaS9zQMM8BCVDwNf7Fn',
  eth: 'https://subgrapher.snapshot.org/subgraph/arbitrum/98f9T2v1KtNnZyexiEgNLMFnYkXdKoZq9Pt1EYQGq5aH'
} as const;

const auctionQuery = gql`
  query GetAuction($id: ID!) {
    auctionDetail(id: $id) {
      addressAuctioningToken
      addressBiddingToken
      symbolAuctioningToken
      symbolBiddingToken
      decimalsAuctioningToken
      decimalsBiddingToken
      orderCancellationEndDate
      endTimeTimestamp
      startingTimeStamp
      minimumBiddingAmountPerOrder
      minFundingThreshold
      currentClearingPrice
      isAtomicClosureAllowed
      isPrivateAuction
      allowListSigner
      exactOrder {
        sellAmount
        price
      }
    }
  }
`;

export async function getAuction(
  id: string,
  network: string
): Promise<{ auctionDetail: AuctionSubgraph } | null> {
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

  if (!data?.auctionDetail) return null;

  return data;
}
