import { defineStore } from 'pinia';
import { utils } from '@snapshot-labs/sx';
import { getNetwork, supportsNullCurrent } from '@/networks';
import type { Proposal, Space } from '@/types';
import type { VotingPower, VotingPowerStatus } from '@/networks/types';

export const useVotingPowersStore = defineStore('votingPowers', () => {
  const { getCurrent } = useMetaStore();

  const votingPowers = ref<
    Record<
      string,
      Record<
        number,
        {
          votingPowers: VotingPower[];
          totalVotingPower: number;
          status: VotingPowerStatus;
          symbol: string;
          decimals: number;
          error: utils.errors.VotingPowerDetailsError | null;
        }
      >
    >
  >({});

  const get = (space: Space, block: string | number = 'latest') => {
    return votingPowers.value[space.id][block];
  };

  const fetch = async (
    item: Space | Proposal,
    account: string,
    block: string | number = 'latest'
  ) => {
    const space: Space = 'space' in item ? (item.space as Space) : item;

    if (votingPowers.value?.[space.id]?.[block]) return;

    const network = getNetwork(item.network);

    votingPowers.value[space.id] ||= {};
    votingPowers.value[space.id][block] = {
      status: 'loading',
      votingPowers: [],
      totalVotingPower: 0,
      decimals: 18,
      symbol: space.voting_power_symbol
    };
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

      votingPowers.value[space.id][block] = {
        ...votingPowers.value[space.id][block],
        votingPowers: vp,
        totalVotingPower: vp.reduce((acc, b) => acc + b.value, 0n),
        status: 'success',
        decimals: Math.max(...vp.map(votingPower => votingPower.decimals), 0)
      };
    } catch (e: unknown) {
      if (e instanceof utils.errors.VotingPowerDetailsError) {
        votingPowers.value[space.id][block].error = e;
      } else {
        console.warn('Failed to load voting power', e);
      }

      votingPowers.value[space.id][block].status = 'error';
    }
  };

  function reset() {
    votingPowers.value = {};
  }

  return {
    get,
    fetch,
    reset
  };
});
