import { getNetwork } from '@/networks';
import type { NetworkID, Proposal, Vote } from '@/types';

const { web3 } = useWeb3();

const votes = ref<Record<Proposal['id'], Vote>>({});
const pendingVotes = ref<Set<string>>(new Set());
const pendingVotesTx = ref<Map<string, string>>(new Map());

watch(
  () => web3.value.account,
  (current, previous) => {
    if (current !== previous) {
      pendingVotes.value.clear();
      pendingVotesTx.value.clear();
    }
  }
);

export function useAccount() {
  const uiStore = useUiStore();

  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    votes.value = {};

    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account);

    votes.value = { ...votes.value, ...userVotes };
  }

  function addPendingVote(proposalId: string, txHash: string) {
    pendingVotes.value.add(proposalId);
    pendingVotesTx.value.set(txHash, proposalId);
  }

  watch(
    () => uiStore.failedTransactions,
    async failedTransactions => {
      if (failedTransactions.length === 0) return;

      failedTransactions.forEach(tx => {
        const proposalId = pendingVotesTx.value.get(tx.txId);

        if (proposalId) {
          pendingVotes.value.delete(proposalId);
          pendingVotesTx.value.delete(tx.txId);
        }
      });
    }
  );

  return {
    account: web3.value.account,
    votes,
    pendingVotes,
    loadVotes,
    addPendingVote
  };
}
