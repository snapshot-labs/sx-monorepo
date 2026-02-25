import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNetwork, offchainNetworks } from '@/networks';
import { VotingPower } from '@/networks/types';
import { Proposal } from '@/types';

type Strategy = {
  name: string;
  params: Record<string, any>;
};

export type VoteValidationPowerItem = {
  votingPowers: VotingPower[];
  threshold: string;
  symbol: string;
  canVote: boolean;
  strategies: Strategy[];
};

async function getVoteValidationPower(account: string, proposal: Proposal) {
  const network = getNetwork(proposal.network);
  // Skipped for onchain proposals, or when using 'any' strategy
  const canVote =
    !offchainNetworks.includes(proposal.network) ||
    proposal.voting_power_validation_strategy_strategies[0] === 'any';

  const vpItem: VoteValidationPowerItem = {
    votingPowers: [],
    symbol: proposal.space.voting_power_symbol,
    threshold: '1', // offchain getVotingPower() will always return 1 when valid
    canVote,
    strategies: proposal.voting_power_validation_strategy_strategies.map(
      (name, i) => {
        return {
          name,
          params: proposal.voting_power_validation_strategy_strategies_params[i]
        };
      }
    )
  };

  if (vpItem.canVote) {
    return vpItem;
  }

  const opts = {
    at: proposal.snapshot,
    chainId: proposal.space.snapshot_chain_id
  };

  const powers = await network.actions.getVotingPower(
    proposal.space.id,
    proposal.voting_power_validation_strategy_strategies,
    proposal.voting_power_validation_strategy_strategies_params,
    [],
    account,
    opts
  );

  const totalPowers = powers.reduce(
    (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
    0
  );

  vpItem.canVote = totalPowers >= Number(vpItem.threshold);

  return vpItem;
}

export function useVoteValidationPowerQuery(
  account: MaybeRefOrGetter<string>,
  proposal: MaybeRefOrGetter<Proposal>,
  active: MaybeRefOrGetter<boolean>
) {
  return useQuery({
    queryKey: [
      'voteValidationPower',
      toRef(() => toValue(account)),
      toRef(() => toValue(proposal).space.id || ''),
      toRef(() => toValue(proposal).id || ''),
      toRef(() => toValue(proposal).snapshot || '')
    ],
    queryFn: async () =>
      getVoteValidationPower(toValue(account), toValue(proposal)),
    enabled: () => !!toValue(account) && toValue(active),
    staleTime: 60 * 1000
  });
}
