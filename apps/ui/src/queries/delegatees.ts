import { getAddress, isAddress } from '@ethersproject/address';
import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNames } from '@/helpers/stamp';
import { getNetwork } from '@/networks';
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
        at: null,
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

function getSplitDelegationStrategy(space: Space) {
  return space.strategies_params.find(
    strategy => strategy.name === 'split-delegation'
  );
}

async function getSplitDelegationDelegatee(
  space: Space,
  delegation: SpaceMetadataDelegation,
  address: string
): Promise<{ votingPower: number; percentOfVotingPower: number }> {
  const splitDelegationStrategy = getSplitDelegationStrategy(space);

  if (!splitDelegationStrategy) {
    throw new Error('Split delegation strategy not found');
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

  if (!response.ok) {
    throw new Error('Failed to fetch delegatee info');
  }

  return response.json();
}

async function fetchSplitDelegationDelegatees(
  account: string,
  delegation: SpaceMetadataDelegation,
  space: Space
): Promise<Delegatee[]> {
  if (!isAddress(account)) {
    return [];
  }

  const splitDelegationStrategy = getSplitDelegationStrategy(space);

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

  if (!response.ok) {
    throw new Error('Failed to fetch delegatees');
  }

  const body = await response.json();

  const delegateesAddresses: string[] = body.delegateTree.map(
    ({ delegate }) => delegate
  );

  const [names, ...delegatees] = await Promise.all([
    getNames(delegateesAddresses),
    ...delegateesAddresses.map(delegateAddress =>
      getSplitDelegationDelegatee(space, delegation, delegateAddress)
    )
  ]);

  return body.delegateTree.map(({ delegate, delegatedPower, weight }, i) => {
    // delegatee's voting power ratio coming from the current account
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
  account: MaybeRefOrGetter<string>,
  space: MaybeRefOrGetter<Space>,
  delegation: MaybeRefOrGetter<SpaceMetadataDelegation | null>
) {
  return useQuery({
    queryKey: [
      'delegatees',
      () => toValue(delegation)?.contractAddress,
      account
    ],
    queryFn: () =>
      FETCH_DELEGATEES_FN[
        toValue(delegation)!.apiType as keyof typeof FETCH_DELEGATEES_FN
      ](toValue(account), toValue(delegation)!, toValue(space)),
    enabled: () =>
      !!toValue(account) &&
      !!toValue(delegation)?.chainId &&
      !!toValue(delegation)?.apiType &&
      !!toValue(delegation)?.apiUrl
  });
}
