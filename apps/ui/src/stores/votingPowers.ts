import { utils } from '@snapshot-labs/sx';
import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import { VotingPower, VotingPowerStatus } from '@/networks/types';
import { Proposal, Space } from '@/types';

const LATEST_BLOCK_NAME = 'latest';

type SpaceDetails = Proposal['space'];
export type VotingPowerItem = {
  votingPowers: VotingPower[];
  totalVotingPower: bigint;
  status: VotingPowerStatus;
  symbol: string;
  decimals: number;
  error: utils.errors.VotingPowerDetailsError | null;
  canPropose: boolean;
  canVote: boolean;
  threshold: {
    propose?: bigint;
    vote?: bigint;
  };
};

export function getIndex(space: SpaceDetails, block: number | null): string {
  return `${space.id}:${block ?? LATEST_BLOCK_NAME}`;
}

export const useVotingPowersStore = defineStore('votingPowers', () => {
  const votingPowers = reactive<Map<string, VotingPowerItem>>(new Map());

  async function fetch(
    item: Space | Proposal,
    account: string,
    block: number | null
  ) {
    const space = 'space' in item ? item.space : item;

    const existingVotingPower = votingPowers.get(getIndex(space, block));
    if (existingVotingPower && existingVotingPower.status === 'success') return;

    const network = getNetwork(item.network);

    let vpItem: VotingPowerItem = {
      status: 'loading',
      votingPowers: [],
      totalVotingPower: 0n,
      decimals: 18,
      symbol: space.voting_power_symbol,
      error: null,
      canPropose: false,
      canVote: false,
      threshold: {}
    };

    if (existingVotingPower) {
      existingVotingPower.status = 'loading';
      votingPowers.set(getIndex(space, block), existingVotingPower);
    }

    try {
      const vp = await network.actions.getVotingPower(
        space.id,
        item.strategies,
        item.strategies_params,
        space.strategies_parsed_metadata,
        account,
        {
          at: block,
          chainId: space.snapshot_chain_id
        }
      );

      vpItem = {
        ...vpItem,
        votingPowers: vp,
        totalVotingPower: vp.reduce((acc, b) => acc + b.value, 0n),
        status: 'success',
        decimals: Math.max(...vp.map(votingPower => votingPower.decimals), 0)
      };

      if ('proposal_threshold' in space) {
        vpItem.threshold.propose = BigInt(space.proposal_threshold);
        vpItem.canPropose = vpItem.totalVotingPower >= vpItem.threshold.propose;
      } else {
        vpItem.threshold.vote = BigInt(
          ((item as Proposal).validation_params.minScore || 0) * 10 ** 18
        );
        vpItem.canVote = vpItem.totalVotingPower > vpItem.threshold.vote;
      }
    } catch (e: unknown) {
      if (e instanceof utils.errors.VotingPowerDetailsError) {
        vpItem.error = e;
      } else {
        console.warn('Failed to load voting power', e);
      }

      vpItem.status = 'error';
    }
    votingPowers.set(getIndex(space, block), vpItem);
  }

  function reset() {
    votingPowers.clear();
  }

  return {
    votingPowers,
    fetch,
    reset
  };
});
