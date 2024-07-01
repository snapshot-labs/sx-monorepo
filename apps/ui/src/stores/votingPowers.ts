import { defineStore } from 'pinia';
import { utils } from '@snapshot-labs/sx';
import { getNetwork, supportsNullCurrent } from '@/networks';
import type { Proposal, Space } from '@/types';
import type { VotingPower, VotingPowerStatus } from '@/networks/types';

type VotingPowerItem = {
  votingPowers: VotingPower[];
  totalVotingPower: bigint;
  status: VotingPowerStatus;
  symbol: string;
  decimals: number;
  error: utils.errors.VotingPowerDetailsError | null;
};

export const useVotingPowersStore = defineStore('votingPowers', () => {
  const { getCurrent } = useMetaStore();

  const votingPowers = reactive<Map<string, VotingPowerItem>>(new Map());

  function getIndex(space: Space, block: string | number) {
    return `${space.id}:${block}`;
  }

  function get(space: Space, block: string | number = 'latest') {
    return votingPowers.get(getIndex(space, block));
  }

  async function fetch(item: Space | Proposal, account: string, block: string | number = 'latest') {
    const space: Space = 'space' in item ? (item.space as Space) : item;

    const existingVotingPower = get(space, block);
    if (existingVotingPower && existingVotingPower.status === 'success') return;

    const network = getNetwork(item.network);

    let vpItem: VotingPowerItem = {
      status: 'loading',
      votingPowers: [],
      totalVotingPower: 0n,
      decimals: 18,
      symbol: space.voting_power_symbol,
      error: null
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
          at: supportsNullCurrent(item.network) ? null : getCurrent(item.network) || 0,
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
    get,
    fetch,
    reset
  };
});
