import { getAddress } from '@ethersproject/address';
import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNames } from '@/helpers/stamp';
import { getNetwork, supportsNullCurrent } from '@/networks';
import { RequiredProperty, Space, SpaceMetadataDelegation } from '@/types';

type Delegatee = {
  id: string;
  balance: number;
  delegatedVotePercentage: number;
  share: number;
  name?: string;
};

const FETCH_DELEGATEES_FN = {
  'governor-subgraph': fetchGovernorSubgraphDelegatees,
  'delegate-registry': fetchDelegateRegistryDelegatees,
  'split-delegation': fetchSplitDelegationDelegatees
} as const;

async function fetchGovernorSubgraphDelegatees(
  account: string,
  delegation: SpaceMetadataDelegation,
  space: Space
): Promise<Delegatee[]> {
  const { getDelegatee } = useActions();
  const { getDelegates } = useDelegates(
    delegation as RequiredProperty<typeof delegation>,
    space
  );

  const delegateeData = await getDelegatee(delegation, account);

  if (!delegateeData) return [];

  const [names, [apiDelegate]] = await Promise.all([
    getNames([delegateeData.address]),
    getDelegates({
      first: 1,
      skip: 0,
      orderBy: 'delegatedVotes',
      orderDirection: 'desc',
      where: {
        // NOTE: This is subgraph, needs to be lowercase
        user: delegateeData.address.toLocaleLowerCase()
      }
    })
  ]);

  return [
    {
      id: delegateeData.address,
      balance: Number(delegateeData.balance) / 10 ** delegateeData.decimals,
      delegatedVotePercentage:
        apiDelegate && apiDelegate.delegatedVotesRaw !== '0'
          ? Number(delegateeData.balance) /
            Number(apiDelegate.delegatedVotesRaw)
          : 1,
      name: names[delegateeData.address],
      share: 100
    }
  ];
}

async function fetchDelegateRegistryDelegatees(
  account: string,
  delegation: SpaceMetadataDelegation,
  space: Space
): Promise<Delegatee[]> {
  const { getDelegates, getDelegation } = useDelegates(
    delegation as RequiredProperty<typeof delegation>,
    space
  );
  const { getCurrent } = useMetaStore();

  const accountDelegation = await getDelegation(account);

  if (!accountDelegation) return [];

  const [names, votingPowers, [apiDelegate]] = await Promise.all([
    getNames([accountDelegation.delegate]),
    getNetwork(space.network).actions.getVotingPower(
      space.id,
      space.strategies,
      space.strategies_params,
      space.strategies_parsed_metadata,
      account,
      {
        at: supportsNullCurrent(space.network)
          ? null
          : getCurrent(space.network) || 0,
        chainId: space.snapshot_chain_id
      }
    ),
    getDelegates({
      first: 1,
      skip: 0,
      orderBy: 'delegatedVotes',
      orderDirection: 'desc',
      where: {
        // NOTE: this is delegate registry, needs to be checksummed
        user: getAddress(accountDelegation.delegate)
      }
    })
  ]);

  const balance = votingPowers.reduce(
    (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
    0
  );

  return [
    {
      id: accountDelegation.delegate,
      balance,
      delegatedVotePercentage: apiDelegate
        ? balance / Number(apiDelegate.delegatedVotes)
        : 1,
      name: names[accountDelegation.delegate],
      share: 100
    }
  ];
}

async function getSplitDelegationDelegatee(
  space: Space,
  delegation: SpaceMetadataDelegation,
  address: string
): Promise<{ votingPower: number; percentOfVotingPower: number }> {
  const splitDelegationStrategy = space.strategies_params.find(
    strategy => strategy.name === 'split-delegation'
  );

  if (!splitDelegationStrategy) {
    return { votingPower: 0, percentOfVotingPower: 0 };
  }

  const response = await fetch(
    `${delegation.apiUrl}/api/v1/${space.id}/pin/${address}`,
    {
      method: 'POST',
      body: JSON.stringify({
        strategy: splitDelegationStrategy
      })
    }
  );

  return response.json();
}

async function fetchSplitDelegationDelegatees(
  account: string,
  delegation: SpaceMetadataDelegation,
  space: Space
): Promise<Delegatee[]> {
  const splitDelegationStrategy = space.strategies_params.find(
    strategy => strategy.name === 'split-delegation'
  );

  if (!splitDelegationStrategy) {
    return [];
  }

  const response = await fetch(
    `${delegation.apiUrl}/api/v1/${space.id}/pin/${account}`,
    {
      method: 'POST',
      body: JSON.stringify({
        strategy: splitDelegationStrategy
      })
    }
  );

  const body = await response.json();

  const delegateesAddresses = body.delegateTree.map(({ delegate }) => delegate);

  const [names, ...delegatees] = await Promise.all([
    getNames(delegateesAddresses),
    ...delegateesAddresses.map(delegate =>
      getSplitDelegationDelegatee(space, delegation, delegate)
    )
  ]);

  return body.delegateTree.map(({ delegate, delegatedPower, weight }, i) => {
    const vpPercentFromDelegator = delegatedPower / delegatees[i].votingPower;
    return {
      id: delegate,
      balance: delegatees[i].votingPower,
      delegatedVotePercentage:
        vpPercentFromDelegator * (delegatees[i].percentOfVotingPower / 10000),
      name: names[delegate],
      share: weight / 100
    };
  });
}

export function useDelegateesQuery(
  account: MaybeRefOrGetter<string | undefined>,
  space: MaybeRefOrGetter<Space>,
  delegation: MaybeRefOrGetter<SpaceMetadataDelegation>
) {
  return useQuery({
    queryKey: [
      'delegatees',
      () => toValue(delegation).contractAddress,
      account
    ],
    queryFn: () =>
      FETCH_DELEGATEES_FN[
        toValue(delegation).apiType as keyof typeof FETCH_DELEGATEES_FN
      ](toValue(account) || '', toValue(delegation), toValue(space)),
    enabled:
      !!toValue(account) &&
      !!toValue(delegation).chainId &&
      !!toValue(delegation).apiType
  });
}
