import { getNetwork } from '@/networks';
import type { NetworkID, Proposal, Vote } from '@/types';

const { web3 } = useWeb3();
const votes = ref<Record<Proposal['id'], Vote>>({});
const pendingVotes = ref<Record<string, boolean>>({});

watch(
  () => web3.value.account,
  (current, previous) => {
    if (current !== previous) {
      pendingVotes.value = {};
    }
  }
);

export function useAccount() {
  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    const account = web3.value.account;
    if (!account) {
      votes.value = {};
      return;
    }

    const network = getNetwork(networkId);
    votes.value = await network.api.loadUserVotes(spaceIds, account);
  }

  function addPendingVote(proposalId: string) {
    pendingVotes.value[proposalId] = true;
  }

  return {
    account: web3.value.account,
    votes,
    pendingVotes,
    loadVotes,
    addPendingVote
  };
}
