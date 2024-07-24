import { getNetwork, offchainNetworks } from '@/networks';
import { NetworkID, Proposal, Vote } from '@/types';

const { web3 } = useWeb3();
const votes = ref<Record<Proposal['id'], Vote>>({});
const pendingVotes = ref<Record<string, boolean>>({});

watch(
  () => web3.value.account,
  (current, previous) => {
    if (current !== previous) {
      votes.value = {};
      pendingVotes.value = {};
    }
  }
);

export function useAccount() {
  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    const account = web3.value.account;
    if (!account) return;

    // On starknet account, we don't load votes for offchain networks (unsupported)
    if (web3.value.type === 'argentx' && offchainNetworks.includes(networkId))
      return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account);

    votes.value = { ...votes.value, ...userVotes };
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
