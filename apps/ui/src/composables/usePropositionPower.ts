import { supportsNullCurrent } from '@/networks';
import { getIndex } from '@/stores/votingPowers';
import { NetworkID, Space } from '@/types';

export function usePropositionPower() {
  const votingPowersStore = useVotingPowersStore();
  const { web3 } = useWeb3();
  const { getCurrent } = useMetaStore();

  function getLatestBlock(network: NetworkID): number | null {
    return supportsNullCurrent(network) ? null : getCurrent(network) ?? 0;
  }

  function fetch(space: Space) {
    votingPowersStore.fetch(
      space,
      web3.value.account,
      getLatestBlock(space.network)
    );
  }

  function get(space: Space) {
    return votingPowersStore.votingPowers.get(
      getIndex(space, getLatestBlock(space.network))
    );
  }

  return { fetch, get };
}
