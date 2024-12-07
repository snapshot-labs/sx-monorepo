import { supportsNullCurrent } from '@/networks';
import { getIndex } from '@/stores/votingPowers';
import { NetworkID, Proposal, Space } from '@/types';

export function useVotingPower() {
  const votingPowersStore = useVotingPowersStore();
  const { web3 } = useWeb3();
  const { getCurrent } = useMetaStore();

  function getLatestBlock(network: NetworkID): number | null {
    return supportsNullCurrent(network) ? null : getCurrent(network) || 0;
  }

  function getProposalSnapshot(proposal: Proposal): number | null {
    return (
      (proposal.state === 'pending' ? null : proposal.snapshot) ||
      getLatestBlock(proposal.network)
    );
  }

  function fetch(space: Space, proposal?: Proposal) {
    if (!web3.value.account) return;

    votingPowersStore.fetch(
      proposal || space,
      web3.value.account,
      proposal ? getProposalSnapshot(proposal) : getLatestBlock(space.network)
    );
  }

  function get(space: Space, proposal?: Proposal) {
    return votingPowersStore.votingPowers.get(
      getIndex(
        proposal ? proposal.space : space,
        proposal ? getProposalSnapshot(proposal) : getLatestBlock(space.network)
      )
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

  return { get, fetch, reset };
}
