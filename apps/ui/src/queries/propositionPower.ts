import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { VotingPower } from '@/networks/types';
import { Space } from '@/types';

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

  // Confidential (Inco) spaces use Vanilla proposal validation (anyone can
  // propose) with no off-chain-introspectable strategies. Short-circuit the
  // VP preview to avoid disabling the Publish button. Scoped to confidential
  // so legacy SX spaces with no validation strategies (likely misconfigured)
  // keep their previous behavior.
  if (
    space.confidential &&
    !space.voting_power_validation_strategy_strategies.length
  ) {
    vpItem.canPropose = true;
    return vpItem;
  }

  if (vpItem.canPropose) {
    return vpItem;
  }

  const opts = {
    at: block,
    chainId: space.snapshot_chain_id
  };

  try {
    const powers = await network.actions.getVotingPower(
      space.id,
      space.voting_power_validation_strategy_strategies,
      space.voting_power_validation_strategy_strategies_params,
      space.voting_power_validation_strategies_parsed_metadata,
      account,
      opts
    );

    const totalPowers = powers.reduce((acc, b) => acc + Number(b.value), 0);
    vpItem.canPropose = totalPowers >= BigInt(space.proposal_threshold);
  } catch (err) {
    // Confidential (Inco) spaces use Vanilla validation strategies that
    // aren't introspectable off-chain. Defer to the on-chain validation at
    // submit time. For every other network, rethrow — masking errors on
    // mainnet would let users hit a broken submit flow without warning.
    if (!space.confidential) throw err;
    console.warn(
      'Proposition power preview failed for confidential space; allowing propose:',
      err
    );
    vpItem.canPropose = true;
  }

  return vpItem;
}

export function usePropositionPowerQuery(space: MaybeRefOrGetter<Space>) {
  return useQuery({
    queryKey: [
      'propositionPower',
      () => web3.value.account,
      () => toValue(space).id,
      null
    ],
    queryFn: async () => getPropositionPower(toValue(space), null),
    enabled: () => !!web3.value.account && !web3.value.authLoading,
    staleTime: 60 * 1000
  });
}
