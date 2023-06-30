import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import gql from 'graphql-tag';
import { getNames } from '@/helpers/ens';

type ApiDelegate = {
  id: string;
  delegatedVotes: string;
  delegatedVotesRaw: string;
  tokenHoldersRepresentedAmount: number;
};

type Delegate = ApiDelegate & {
  name: string | null;
  delegatorsPercentage: number;
  votesPercentage: number;
};

type Governance = {
  delegatedVotes: string;
  totalTokenHolders: string;
  totalDelegates: string;
};

const DELEGATES_LIMIT = 40;

const DELEGATES_QUERY = gql`
  query ($first: Int!, $skip: Int!) {
    delegates(first: $first, skip: $skip, orderBy: delegatedVotes, orderDirection: desc) {
      id
      delegatedVotes
      delegatedVotesRaw
      tokenHoldersRepresentedAmount
    }
    governance(id: "GOVERNANCE") {
      delegatedVotes
      totalTokenHolders
      totalDelegates
    }
  }
`;

function convertUrl(apiUrl: string) {
  const hostedPattern = /https:\/\/thegraph\.com\/hosted-service\/subgraph\/([\w-]+)\/([\w-]+)/;

  const hostedMatch = apiUrl.match(hostedPattern);
  if (hostedMatch) {
    return `https://api.thegraph.com/subgraphs/name/${hostedMatch[1]}/${hostedMatch[2]}`;
  }

  return apiUrl;
}

export function useDelegates(delegationApiUrl: string) {
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

  async function _fetch(overwrite: boolean) {
    const { data } = await apollo.query({
      query: DELEGATES_QUERY,
      variables: {
        first: DELEGATES_LIMIT,
        skip: overwrite ? 0 : delegates.value.length
      }
    });

    const governanceData = data.governance as Governance;
    const delegatesData = data.delegates as ApiDelegate[];
    const addresses = delegatesData.map(delegate => delegate.id);

    const names = await getNames(addresses);

    const newDelegates = delegatesData.map((delegate: ApiDelegate) => {
      const delegatorsPercentage =
        (Number(delegate.tokenHoldersRepresentedAmount) /
          Number(governanceData.totalTokenHolders)) *
        100;
      const votesPercentage =
        (Number(delegate.delegatedVotes) / Number(governanceData.delegatedVotes)) * 100;

      return {
        name: names[delegate.id] || null,
        ...delegate,
        delegatorsPercentage,
        votesPercentage
      };
    });

    delegates.value = overwrite ? newDelegates : [...delegates.value, ...newDelegates];

    hasMore.value = delegatesData.length === DELEGATES_LIMIT;
  }

  async function fetch() {
    if (loading.value || loaded.value) return;
    loading.value = true;

    try {
      await _fetch(true);

      loaded.value = true;
    } catch (e) {
      failed.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMore() {
    if (loading.value || !loaded.value) return;
    loadingMore.value = true;

    await _fetch(false);

    loadingMore.value = false;
  }

  return {
    loading,
    loadingMore,
    loaded,
    failed,
    hasMore,
    delegates,
    fetch,
    fetchMore
  };
}
