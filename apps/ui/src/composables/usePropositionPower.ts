import { supportsNullCurrent } from '@/networks';
import { getIndex } from '@/stores/votingPowers';
import { NetworkID, Space } from '@/types';

export function usePropositionPower() {
  const votingPowersStore = useVotingPowersStore();
  const { web3 } = useWeb3();
  const { getCurrent } = useMetaStore();

  function latestBlock(network: NetworkID) {
    return supportsNullCurrent(network) ? null : getCurrent(network) ?? 0;
  }

  function fetch(space: Space) {
    votingPowersStore.fetch(
      space,
      web3.value.account,
      latestBlock(space.network)
    );
  }

  function get(space: Space) {
    return votingPowersStore.votingPowers.get(
      getIndex(space, latestBlock(space.network))
    );
  }

  function reset() {
    votingPowersStore.reset();
  }

  watch(
    () => web3.value.account,
    account => {
      if (!account) reset();
    }
  );

  return { fetch, get, reset };
}
