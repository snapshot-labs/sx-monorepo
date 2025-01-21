import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { getNames } from '@/helpers/stamp';
import { getNetwork, metadataNetwork as metadataNetworkId } from '@/networks';
import { DelegationType, Space, Statement } from '@/types';

type ApiDelegate = {
  id: string;
  user: string;
  delegatedVotes: string;
  delegatedVotesRaw: string;
  tokenHoldersRepresentedAmount: number;
};

export type Delegate = ApiDelegate & {
  name: string | null;
  delegatorsPercentage: number;
  votesPercentage: number;
  statement?: Statement;
};

type Governance = {
  delegatedVotes: string;
  totalDelegates: string;
};

type DelegatesQueryFilter = {
  orderBy: string;
  orderDirection: string;
  skip: number;
  first: number;
  where?: {
    user?: string;
  };
};

const DELEGATES_QUERY = gql`
  query (
    $first: Int!
    $skip: Int!
    $orderBy: Delegate_orderBy!
    $orderDirection: OrderDirection!
    $governance: String!
  ) {
    delegates(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { tokenHoldersRepresentedAmount_gte: 0, governance: $governance }
    ) {
      id
      user
      delegatedVotes
      delegatedVotesRaw
      tokenHoldersRepresentedAmount
    }
    governance(id: $governance) {
      delegatedVotes
      totalDelegates
    }
  }
`;

const metadataNetwork = getNetwork(metadataNetworkId);

function convertUrl(apiUrl: string) {
  const hostedPattern =
    /https:\/\/thegraph\.com\/hosted-service\/subgraph\/([\w-]+)\/([\w-]+)/;

  const hostedMatch = apiUrl.match(hostedPattern);
  if (hostedMatch) {
    return `https://api.thegraph.com/subgraphs/name/${hostedMatch[1]}/${hostedMatch[2]}`;
  }

  return apiUrl;
}

export function useDelegates(
  delegationType: DelegationType,
  delegationApiUrl: string,
  governance: string,
  space: Space
) {
  const httpLink = createHttpLink({
    uri: convertUrl(delegationApiUrl)
  });

  const apollo = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      addTypename: false
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache'
      }
    }
  });

  async function formatDelegates(data: {
    governance: Governance;
    delegates: ApiDelegate[];
  }): Promise<Delegate[]> {
    const governanceData = data.governance;
    const delegatesData = data.delegates;
    const addresses = delegatesData.map(delegate => delegate.user);

    const [names, statements] = await Promise.all([
      getNames(addresses),
      metadataNetwork.api.loadStatements(space.network, space.id, addresses)
    ]);
    const indexedStatements = statements.reduce(
      (acc, statement) => {
        acc[statement.delegate.toLowerCase()] = statement;
        return acc;
      },
      {} as Record<Statement['delegate'], Statement>
    );

    return delegatesData.map((delegate: ApiDelegate) => {
      const delegatorsPercentage =
        Number(delegate.tokenHoldersRepresentedAmount) /
        Number(governanceData.totalDelegates);
      const votesPercentage =
        Number(delegate.delegatedVotes) /
          Number(governanceData.delegatedVotes) || 0;

      return {
        name: names[delegate.user] || null,
        ...delegate,
        delegatorsPercentage,
        votesPercentage,
        statement: indexedStatements[delegate.user.toLowerCase()]
      };
    });
  }

  async function getDelegates(
    filter: DelegatesQueryFilter
  ): Promise<Delegate[]> {
    const { data } = await apollo.query({
      query: DELEGATES_QUERY,
      variables: { ...filter, governance: governance.toLowerCase() }
    });

    return formatDelegates(data);
  }

  return {
    getDelegates
  };
}
