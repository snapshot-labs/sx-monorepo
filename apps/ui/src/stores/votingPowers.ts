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
          status: VotingPowerStatus;
          symbol: string;
          error: utils.errors.VotingPowerDetailsError | null;
        }
      >
    >
  >({});

  const get = (space: Space, block = 'latest') => {
    return votingPowers.value[space.id][block];
  };

  const fetch = async (item: Space | Proposal, account: string, block = 'latest') => {
    const space: Space = 'space' in item ? (item.space as Space) : item;

    if (votingPowers.value?.[space.id]?.[block]) return;

    const network = computed(() => getNetwork(space.network));
    votingPowers.value[space.id] ||= {};
    votingPowers.value[space.id][block] = {
      status: 'loading',
      votingPowers: [],
      symbol: space.voting_power_symbol
    };
    try {
      votingPowers.value[space.id][block].votingPowers = await network.value.actions.getVotingPower(
        space.id,
        item.strategies,
        item.strategies_params,
        space.strategies_parsed_metadata,
        account,
        {
          at: supportsNullCurrent(space.network) ? null : getCurrent(space.network) || 0,
          chainId: space.snapshot_chain_id
        }
      );
      votingPowers.value[space.id][block].status = 'success';
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
    votingPowers,
    get,
    fetch,
    reset
  };
});
