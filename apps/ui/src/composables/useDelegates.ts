import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import gql from 'graphql-tag';
import { getNames } from '@/helpers/stamp';
import { NetworkID } from '@/types';

type ApiDelegate = {
  id: string;
  delegatedVotes: string;
  tokenHoldersRepresentedAmount: number;
};

type ApiDelegator = {
  id: string;
  tokenBalance: string;
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

type DelegatesSort =
  | 'delegatedVotes-desc'
  | 'delegatedVotes-asc'
  | 'tokenHoldersRepresentedAmount-desc'
  | 'tokenHoldersRepresentedAmount-asc';

type DelegatorsSort = 'tokenBalance-desc' | 'tokenBalance-asc';

const { web3Account } = useWeb3();

type DelegateTabs = 'delegates' | 'my-delegators';

const DELEGATES_LIMIT = 40;

const DELEGATES_QUERY = gql`
  query ($first: Int!, $skip: Int!, $orderBy: Delegate_orderBy!, $orderDirection: OrderDirection!) {
    delegates(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { tokenHoldersRepresentedAmount_gte: 0 }
    ) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
    }
    governance(id: "GOVERNANCE") {
      delegatedVotes
      totalTokenHolders
      totalDelegates
    }
  }
`;

const MY_DELEGATORS_QUERY = network => gql`
  query (
    $first: Int!
    $skip: Int!
    $orderBy: TokenHolder_orderBy!
    $orderDirection: OrderDirection!
    $id: String!
  ) {
    delegate(id: $id) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
    }
    ${network === 'sn' ? 'tokenholders' : 'tokenHolders'}(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      tokenBalance
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

export function useDelegates(delegationApiUrl: string, network: NetworkID) {
  const delegates: Ref<Delegate[]> = ref([]);
  const delegators: Ref<any> = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const loaded = ref(false);
  const failed = ref(false);
  const hasMore = ref(false);
  const tab: Ref<DelegateTabs> = ref('delegates'); // ref('my-delegators'); ///

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

  async function _fetchDelegates(
    overwrite: boolean,
    sortBy: DelegatesSort = 'delegatedVotes-desc'
  ) {
    const [orderBy, orderDirection] = sortBy.split('-');

    const { data } = await apollo.query({
      query: DELEGATES_QUERY,
      variables: {
        orderBy,
        orderDirection,
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
        (Number(delegate.delegatedVotes) / Number(governanceData.delegatedVotes)) * 100 || 0;

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

  async function _fetchDelegators(
    overwrite: boolean,
    sortBy: DelegatorsSort = 'tokenBalance-desc'
  ) {
    const [orderBy, orderDirection] = sortBy.split('-');

    const { data } = await apollo.query({
      query: MY_DELEGATORS_QUERY(network),
      variables: {
        orderBy,
        orderDirection,
        first: DELEGATES_LIMIT,
        skip: overwrite ? 0 : delegates.value.length,
        id: web3Account.value.toLowerCase()
      }
    });

    if (data.delegate === null) return [];
    const delegatorsData = data[network === 'sn' ? 'tokenholders' : 'tokenHolders'] as any[];
    const addresses = delegatorsData.map(delegator => delegator.id);

    const names = await getNames(addresses);

    const newDelegators = delegatorsData.map((delegator: ApiDelegator) => {
      const votesPercentage =
        (Number(delegator.tokenBalance) / Number(data.delegate.delegatedVotes)) * 100 || 0;

      return {
        name: names[delegator.id] || null,
        id: delegator.id,
        delegatedVotes: Number(delegator.tokenBalance),
        votesPercentage
      };
    });
    // for now
    delegators.value = overwrite ? newDelegators : [...delegators.value, ...newDelegators];
    console.log('delegators.value', delegators.value);
    hasMore.value = delegatorsData.length === DELEGATES_LIMIT;
  }

  async function fetch(sortBy) {
    if (loading.value || loaded.value) return;
    loading.value = true;

    try {
      if (tab.value === 'delegates') await _fetchDelegates(true, sortBy);
      else await _fetchDelegators(true, sortBy);

      loaded.value = true;
    } catch (e) {
      failed.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMore(sortBy) {
    if (loading.value || !loaded.value) return;
    loadingMore.value = true;

    if (tab.value === 'delegates') await _fetchDelegates(false, sortBy);
    else await _fetchDelegators(false, sortBy);

    loadingMore.value = false;
  }

  function reset() {
    delegates.value = [];
    delegators.value = [];
    loading.value = false;
    loadingMore.value = false;
    loaded.value = false;
    failed.value = false;
    hasMore.value = false;
  }

  watch([tab, web3Account], () => {
    console.log('tab/web3 changed');
    reset();
    fetch(tab.value === 'delegates' ? 'delegatedVotes-desc' : 'tokenBalance-desc');
  });

  return {
    loading,
    loadingMore,
    loaded,
    failed,
    hasMore,
    delegates,
    delegators,
    fetch,
    fetchMore,
    reset,
    tab
  };
}
