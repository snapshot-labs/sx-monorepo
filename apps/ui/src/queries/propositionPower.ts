import { useQuery } from '@tanstack/vue-query';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork, supportsNullCurrent } from '@/networks';
import { VotingPower } from '@/networks/types';
import { NetworkID, Space } from '@/types';

type Strategy = {
  name: string;
  params: any;
};

export type PropositionPowerItem = {
  votingPowers: VotingPower[];
  threshold: string;
  symbol: string;
  canPropose: boolean;
  strategies: Strategy[];
};

const { web3 } = useWeb3();

function getLatestBlock(network: NetworkID): number | null {
  const { getCurrent } = useMetaStore();
  return supportsNullCurrent(network) ? null : getCurrent(network) ?? 0;
}

function getIsSpaceMember(space: Space, account: string): boolean {
  return [
    ...(space.additionalRawData?.admins || []),
    ...(space.additionalRawData?.moderators || []),
    ...(space.additionalRawData?.members || [])
  ]
    .filter(Boolean)
    .some(member => compareAddresses(member, account));
}

async function getPropositionPower(space: Space, block: number | null) {
  const account = web3.value.account;
  const isSpaceMember = getIsSpaceMember(space, account);
  const network = getNetwork(space.network);

  const vpItem: PropositionPowerItem = {
    votingPowers: [],
    symbol: space.voting_power_symbol,
    threshold: space.proposal_threshold,
    canPropose: isSpaceMember,
    strategies: space.voting_power_validation_strategy_strategies.map(
      (name, i) => {
        const metadata =
          space.voting_power_validation_strategies_parsed_metadata[i];

        return {
          name: metadata?.name ?? name,
          params:
            metadata ??
            space.voting_power_validation_strategy_strategies_params[i]
        };
      }
    )
  };

  if (vpItem.canPropose) {
    return vpItem;
  }

  const opts = {
    at: block,
    chainId: space.snapshot_chain_id
  };

  const powers = await network.actions.getVotingPower(
    space.id,
    space.voting_power_validation_strategy_strategies,
    space.voting_power_validation_strategy_strategies_params,
    space.voting_power_validation_strategies_parsed_metadata,
    account,
    opts
  );

  const totalPowers = powers.reduce(
    (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
    0
  );

  vpItem.canPropose = totalPowers >= BigInt(space.proposal_threshold);

  return vpItem;
}

export function usePropositionPowerQuery(space: Space) {
  const block = getLatestBlock(space.network);

  return useQuery({
    queryKey: ['propositionPower', () => web3.value.account, space.id, block],
    queryFn: async () => getPropositionPower(space, block),
    enabled: () => !!web3.value.account && !web3.value.authLoading,
    staleTime: 60 * 1000
  });
}
