import { supportsNullCurrent } from '@/networks';
import { getIndex } from '@/stores/votingPowers';
import { NetworkID, Proposal, Space } from '@/types';

export function useVoteVotingPower() {
  const votingPowersStore = useVotingPowersStore();
  const { web3 } = useWeb3();
  const { getCurrent } = useMetaStore();

  function latestBlock(network: NetworkID) {
    return supportsNullCurrent(network) ? null : getCurrent(network) || 0;
  }

  function proposalSnapshot(proposal: Proposal) {
    return (
      (proposal.state === 'pending' ? null : proposal.snapshot) ||
      latestBlock(proposal.network)
    );
  }

  function fetchProposalVp(proposal: Proposal) {
    if (!web3.value.account) return;

    votingPowersStore.fetch(
      proposal,
      web3.value.account,
      proposalSnapshot(proposal)
    );
  }

  function fetchSpaceVp(space: Space) {
    if (!web3.value.account) return;

    votingPowersStore.fetch(
      space,
      web3.value.account,
      latestBlock(space.network)
    );
  }

  function getProposalVp(proposal: Proposal) {
    return votingPowersStore.votingPowers.get(
      getIndex(proposal.space, proposalSnapshot(proposal))
    );
  }

  function getSpaceVp(space: Space) {
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

  return { getProposalVp, getSpaceVp, fetchProposalVp, fetchSpaceVp, reset };
}
