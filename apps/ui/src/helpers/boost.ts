import { ApolloClient, gql, InMemoryCache } from '@apollo/client/core';

type BoostSubgraph = {
  id: string;
  strategyURI: string;
  poolSize: string;
  guard: string;
  start: string;
  end: string;
  owner: string;
  chainId: string;
  currentBalance: string;
  transaction: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
  };
  strategy: {
    id: string;
    version: string;
    name: string;
    proposal: string;
    eligibility: {
      type: 'incentive' | 'prediction' | 'bribe';
      choice: string | null;
    };
    distribution: {
      type: 'weighted' | 'lottery';
      limit: string | null;
      numWinners: string | null;
    };
  };
};

const TWO_WEEKS = 1209600;

const SUBGRAPH_URLS = {
  '1': 'https://subgrapher.snapshot.org/subgraph/arbitrum/A6EEuSAB7mFrWvLBnL1HZXwfiGfqFYnFJjc14REtMNkd',
  '11155111':
    'https://subgrapher.snapshot.org/subgraph/arbitrum/6T64qrPe7S46zhArSoBF8CAmc5cG3PyKa92Nt4Jhymcy',
  '137':
    'https://subgrapher.snapshot.org/subgraph/arbitrum/CkNpf5gY7XPCinJWP1nh8K7u6faXwDjchGGV4P9rgJ7',
  '8453':
    'https://subgrapher.snapshot.org/subgraph/arbitrum/52uVpyUHkkMFieRk1khbdshUw26CNHWAEuqLojZzcyjd'
};

const SUPPORTED_NETWORKS = Object.keys(SUBGRAPH_URLS);

const boostQuery = gql(`query Boosts($proposalIds: [String!]) {
  boosts (where: {strategy_: {proposal_in: $proposalIds}}) {
    id
    strategyURI
    poolSize
    guard
    start
    end
    owner
    currentBalance
    transaction
    token {
      id
      name
      symbol
      decimals
    }
    strategy {
      id
      name
      version
      proposal
      eligibility {
        type
        choice
      }
      distribution {
        type
        limit
        numWinners
      }
    }
  }
}`);

async function getBoosts(proposalIds: string[]) {
  async function query(chainId: string) {
    console.log('querying chain', chainId);
    const client = new ApolloClient({
      uri: SUBGRAPH_URLS[chainId],
      cache: new InMemoryCache()
    });

    const { data } = await client.query({
      query: boostQuery,
      variables: { proposalIds }
    });

    if (!data?.boosts) return { boosts: [] };
    return {
      boosts: data.boosts.map((boost: BoostSubgraph) => ({
        ...boost,
        chainId
      }))
    };
  }

  const requests = SUPPORTED_NETWORKS.map(chainId => query(chainId));
  const responses: { boosts: BoostSubgraph[] }[] = await Promise.all(requests);

  return responses
    .map(response => response.boosts)
    .filter(boost => boost)
    .flat();
}
function sanitizeBoosts(
  boosts: BoostSubgraph[],
  bribeEnabled: boolean,
  proposalEnd: number
) {
  return boosts.filter(
    boost =>
      !(
        (bribeEnabled && boost.strategy.eligibility.type === 'bribe') ||
        Number(boost.start) !== proposalEnd ||
        Number(boost.end) - Number(boost.start) !== TWO_WEEKS
      )
  );
}

export async function getBoostsCount(
  proposalID: string,
  bribeEnabled: boolean,
  proposalEnd: number
): Promise<number> {
  const response = await getBoosts([proposalID]);
  const sanitizedBoosts = sanitizeBoosts(response, bribeEnabled, proposalEnd);

  return sanitizedBoosts.length;
}
