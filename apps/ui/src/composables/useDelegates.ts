import {
  ApolloClient,
  createHttpLink,
  DocumentNode,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { getNames } from '@/helpers/stamp';
import { getNetwork, metadataNetwork as metadataNetworkId } from '@/networks';
import { DelegationType, Space, Statement } from '@/types';

type ApiDelegate = {
  id: string;
  user?: string;
  delegatedVotes: string;
  delegatedVotesRaw: string;
  tokenHoldersRepresentedAmount: number;
};

export type Delegate = Required<ApiDelegate> & {
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
};

type SortOrder =
  | 'delegatedVotes-desc'
  | 'delegatedVotes-asc'
  | 'tokenHoldersRepresentedAmount-desc'
  | 'tokenHoldersRepresentedAmount-asc';

const DEFAULT_ORDER = 'delegatedVotes-desc';

const DELEGATES_LIMIT = 40;

const DELEGATES_QUERY_GOVERNOR_SUBGRAPH = gql`
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

const DELEGATES_QUERY_COMPOUND_GOVERNOR = gql`
  query (
    $first: Int!
    $skip: Int!
    $orderBy: Delegate_orderBy!
    $orderDirection: OrderDirection!
  ) {
    delegates(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { tokenHoldersRepresentedAmount_gte: 0 }
    ) {
      id
      delegatedVotes
      delegatedVotesRaw
      tokenHoldersRepresentedAmount
    }
    governance(id: "GOVERNANCE") {
      delegatedVotes
      totalDelegates
    }
  }
`;

const DELEGATIONS_PARAMS: Partial<
  Record<DelegationType, { userField: string; query: DocumentNode }>
> = {
  'compound-governor': {
    userField: 'id',
    query: DELEGATES_QUERY_COMPOUND_GOVERNOR
  },
  'governor-subgraph': {
    userField: 'user',
    query: DELEGATES_QUERY_GOVERNOR_SUBGRAPH
  },
  'delegate-registry': {
    userField: 'user',
    query: DELEGATES_QUERY_GOVERNOR_SUBGRAPH
  }
};

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
  const delegates: Ref<Delegate[]> = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const loaded = ref(false);
  const failed = ref(false);
  const hasMore = ref(false);
  const errorCode = ref<'initializing' | null>(null);

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
    const delegationParams = DELEGATIONS_PARAMS[delegationType];
    if (!delegationParams) throw new Error('Unsupported delegation type');

    const governanceData = data.governance;
    const delegatesData = data.delegates;
    const addresses = delegatesData.map(
      delegate => delegate[delegationParams.userField]
    );

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
      const delegateAddress = delegate[delegationParams.userField];

      return {
        name: names[delegateAddress] || null,
        user: delegateAddress,
        ...delegate,
        delegatorsPercentage,
        votesPercentage,
        statement: indexedStatements[delegateAddress.toLowerCase()]
      };
    });
  }

  async function getDelegates(
    filter: DelegatesQueryFilter
  ): Promise<Delegate[]> {
    const delegationParams = DELEGATIONS_PARAMS[delegationType];
    if (!delegationParams) throw new Error('Unsupported delegation type');

    const { data } = await apollo.query({
      query: delegationParams.query,
      variables: { ...filter, governance: governance.toLowerCase() }
    });

    return formatDelegates(data);
  }

  async function _fetch(overwrite: boolean, sortBy: SortOrder) {
    const [orderBy, orderDirection] = sortBy.split('-');

    const newDelegates = await getDelegates({
      orderBy,
      orderDirection,
      skip: overwrite ? 0 : delegates.value.length,
      first: DELEGATES_LIMIT
    });

    delegates.value = overwrite
      ? newDelegates
      : [...delegates.value, ...newDelegates];

    hasMore.value = newDelegates.length === DELEGATES_LIMIT;
  }

  async function fetch(sortBy: SortOrder = DEFAULT_ORDER) {
    if (loading.value || loaded.value) return;
    loading.value = true;

    try {
      await _fetch(true, sortBy);

      loaded.value = true;
    } catch (e) {
      failed.value = true;

      if (e.message.includes('Row not found')) {
        errorCode.value = 'initializing';
      }
    } finally {
      loading.value = false;
      loaded.value = true;
    }
  }

  async function fetchMore(sortBy: SortOrder = DEFAULT_ORDER) {
    if (loading.value || !loaded.value) return;
    loadingMore.value = true;

    await _fetch(false, sortBy);

    loadingMore.value = false;
  }

  function reset() {
    delegates.value = [];
    loading.value = false;
    loadingMore.value = false;
    loaded.value = false;
    failed.value = false;
    hasMore.value = false;
  }

  return {
    loading,
    loadingMore,
    loaded,
    failed,
    errorCode,
    hasMore,
    delegates,
    getDelegates,
    fetch,
    fetchMore,
    reset
  };
}
