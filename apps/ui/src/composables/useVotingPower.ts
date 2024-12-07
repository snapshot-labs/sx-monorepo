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

  function getSnapshot(
    space: Space | Proposal['space'],
    proposal?: Proposal
  ): number | null {
    return proposal
      ? getProposalSnapshot(proposal)
      : getLatestBlock((space as Space).network);
  }

  function fetch(space: Space | Proposal['space'], proposal?: Proposal) {
    if (!web3.value.account) return;

    votingPowersStore.fetch(
      proposal || (space as Space),
      web3.value.account,
      getSnapshot(space, proposal)
    );
  }

  function get(space: Space | Proposal['space'], proposal?: Proposal) {
    return votingPowersStore.votingPowers.get(
      getIndex(proposal?.space || space, getSnapshot(space, proposal))
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
