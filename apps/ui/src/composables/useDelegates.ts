import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { getNames } from '@/helpers/stamp';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Space, Statement } from '@/types';

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
};

type SortOrder =
  | 'delegatedVotes-desc'
  | 'delegatedVotes-asc'
  | 'tokenHoldersRepresentedAmount-desc'
  | 'tokenHoldersRepresentedAmount-asc';

const DEFAULT_ORDER = 'delegatedVotes-desc';

const DELEGATES_LIMIT = 40;

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

const offchainNetworkId = offchainNetworks.filter(network =>
  enabledNetworks.includes(network)
)[0];
const offchainNetwork = getNetwork(offchainNetworkId);

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

  async function formatDelegates(
    data: {
      governance: Governance;
      delegates: ApiDelegate[];
    },
    statements: Statement[]
  ): Promise<Delegate[]> {
    const governanceData = data.governance;
    const delegatesData = data.delegates;
    const addresses = delegatesData.map(delegate => delegate.user);
    const names = await getNames(addresses);
    const indexedStatements = statements.reduce(
      (acc, statement) => {
        acc[statement.delegate] = statement;
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
        statement: indexedStatements[delegate.user]
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

    const statements = await offchainNetwork.api.loadStatements(
      space.network,
      space.id,
      data.delegates.map(delegate => delegate.user)
    );

    return formatDelegates(data, statements);
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
    } finally {
      loading.value = false;
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
    hasMore,
    delegates,
    getDelegates,
    fetch,
    fetchMore,
    reset
  };
}
