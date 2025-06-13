import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { getNames } from '@/helpers/stamp';
import { getNetwork, metadataNetwork as metadataNetworkId } from '@/networks';
import {
  RequiredProperty,
  Space,
  SpaceMetadataDelegation,
  Statement
} from '@/types';

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

const DELEGATION_SUBGRAPHS = {
  '1': 'https://subgrapher.snapshot.org/delegation/1',
  '10': 'https://subgrapher.snapshot.org/delegation/10',
  '56': 'https://subgrapher.snapshot.org/delegation/56',
  '100': 'https://subgrapher.snapshot.org/delegation/100',
  '137': 'https://subgrapher.snapshot.org/delegation/137',
  '146': 'https://subgrapher.snapshot.org/delegation/146',
  '250': 'https://subgrapher.snapshot.org/delegation/250',
  '8453': 'https://subgrapher.snapshot.org/delegation/8453',
  '33139':
    'https://api.goldsky.com/api/public/project_cmb7myliieemg01v8928cd8rs/subgraphs/snapshot-apechain/0.0.1/gn',
  '33111':
    'https://api.goldsky.com/api/public/project_cmb7myliieemg01v8928cd8rs/subgraphs/snapshot-curtis/0.0.1/gn',
  '42161': 'https://subgrapher.snapshot.org/delegation/42161',
  '59144': 'https://subgrapher.snapshot.org/delegation/59144',
  '81457': 'https://subgrapher.snapshot.org/delegation/81457',
  '84532': 'https://subgrapher.snapshot.org/delegation/84532',
  '11155111': 'https://subgrapher.snapshot.org/delegation/11155111'
};

const DELEGATES_QUERY = gql`
  query (
    $first: Int!
    $skip: Int!
    $orderBy: Delegate_orderBy!
    $orderDirection: OrderDirection!
    $where: Delegate_filter
    $governance: String!
  ) {
    delegates(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
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

const DELEGATIONS_RAW_QUERY = gql`
  query ($space: String, $delegator: String!) {
    delegations(
      first: $first
      where: { space_raw: $space, delegator: $delegator }
    ) {
      id
      delegate
    }
  }
`;

const DELEGATIONS_QUERY = gql`
  query ($space: String!, $delegator: String!) {
    delegations(
      first: $first
      where: { space: $space, delegator: $delegator }
    ) {
      id
      delegate
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
  delegation: RequiredProperty<SpaceMetadataDelegation>,
  space: Space
) {
  const httpLink = createHttpLink({
    uri: convertUrl(delegation.apiUrl)
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

    return delegatesData.map(
      (
        delegate: ApiDelegate & {
          delegatorsPercentage?: number;
          votesPercentage?: number;
        }
      ) => {
        const delegatorsPercentage =
          delegate.delegatorsPercentage ??
          Number(delegate.tokenHoldersRepresentedAmount) /
            Number(governanceData.totalDelegates);
        const votesPercentage =
          delegate.votesPercentage ??
          (Number(delegate.delegatedVotes) /
            Number(governanceData.delegatedVotes) ||
            0);

        return {
          name: names[delegate.user] || null,
          ...delegate,
          delegatorsPercentage,
          votesPercentage,
          statement: indexedStatements[delegate.user.toLowerCase()]
        };
      }
    );
  }

  async function getSplitDelegationDelegates(
    filter: DelegatesQueryFilter
  ): Promise<Delegate[]> {
    const orderBy =
      filter.orderBy === 'tokenHoldersRepresentedAmount' ? 'count' : 'power';
    const splitDelegationStrategy = space.strategies_params.find(
      strategy => strategy.name === 'split-delegation'
    );

    const response = await fetch(
      `${delegation.apiUrl}/api/v1/${space.id}/pin/top-delegates?by=${orderBy}&limit=${filter.first}&offset=${filter.skip}`,
      {
        method: 'POST',
        body: JSON.stringify({
          strategy: splitDelegationStrategy
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch split delegation delegates');
    }

    const body = await response.json();

    return formatDelegates({
      delegates: body.delegates
        .filter(d => d.delegatorCount)
        .map(d => ({
          id: d.address,
          user: d.address,
          delegatedVotes: d.votingPower.toString(),
          tokenHoldersRepresentedAmount: d.delegatorCount,
          delegatorsPercentage: d.percentOfDelegators / 10000,
          votesPercentage: d.percentOfVotingPower / 10000
        })),
      governance: {
        delegatedVotes: '0',
        totalDelegates: '0'
      }
    });
  }

  async function getCompoundDelegationDelegates(
    filter: DelegatesQueryFilter
  ): Promise<Delegate[]> {
    const where = {
      tokenHoldersRepresentedAmount_gte: 0,
      governance: delegation.contractAddress.toLowerCase(),
      ...filter.where
    };

    const { data } = await apollo.query({
      query: DELEGATES_QUERY,
      variables: { ...filter, governance: where.governance, where }
    });

    return formatDelegates(data);
  }

  async function getApeChainDelegationDelegates(
    filter: DelegatesQueryFilter
  ): Promise<Delegate[]> {
    const CUSTOM_GOVERNANCES = {
      33139: 'apechain',
      33111: 'curtis'
    };

    const where = {
      tokenHoldersRepresentedAmount_gte: 0,
      governance: `${CUSTOM_GOVERNANCES[delegation.chainId]}:${delegation.contractAddress}`,
      ...filter.where
    };

    const { data } = await apollo.query({
      query: DELEGATES_QUERY,
      variables: { ...filter, governance: where.governance, where }
    });

    return formatDelegates(data);
  }

  async function getDelegates(
    filter: DelegatesQueryFilter
  ): Promise<Delegate[]> {
    if (delegation.apiType === 'split-delegation') {
      return getSplitDelegationDelegates(filter);
    }

    if (delegation.apiType === 'apechain-delegate-registry') {
      return getApeChainDelegationDelegates(filter);
    }

    return getCompoundDelegationDelegates(filter);
  }

  async function getDelegation(delegator: string) {
    if (
      delegation.apiType !== 'delegate-registry' &&
      delegation.apiType !== 'apechain-delegate-registry'
    ) {
      throw new Error('getDelegation is only supported for delegate-registry');
    }

    const delegationSubgraph = DELEGATION_SUBGRAPHS[delegation.chainId];
    if (!delegationSubgraph) {
      throw new Error('Delegation subgraph not found');
    }

    const client = new ApolloClient({
      uri: delegationSubgraph,
      cache: new InMemoryCache()
    });

    const isApeChainDelegateRegistry =
      delegation.apiType === 'apechain-delegate-registry';

    const query = isApeChainDelegateRegistry
      ? DELEGATIONS_RAW_QUERY
      : DELEGATIONS_QUERY;

    const { data } = await client.query({
      query,
      variables: {
        space: isApeChainDelegateRegistry
          ? delegation.contractAddress
          : space.id,
        delegator
      }
    });

    return data.delegations[0] ?? null;
  }

  return {
    getDelegates,
    getDelegation
  };
}
