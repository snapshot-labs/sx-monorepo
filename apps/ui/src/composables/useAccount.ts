import { getNetwork } from '@/networks';
import { NetworkID, Proposal, Vote } from '@/types';

const VOTES_LIMIT = 1000;

const { web3, auth } = useWeb3();

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
    if (!auth.value) return;

    const account = auth.value.account;
    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account, {
      limit: VOTES_LIMIT
    });

    // Load local votes for local proposals
    const localVotes: Record<Proposal['id'], Vote> = {};
    for (const spaceId of spaceIds) {
      const voteKey = `localVotes:${spaceId}`;
      const spaceVotes = JSON.parse(localStorage.getItem(voteKey) || '[]');

      // Filter votes for current user
      const userLocalVotes = spaceVotes.filter(
        (vote: any) => vote.voter.id === account
      );

      // Convert to the expected format
      userLocalVotes.forEach((vote: any) => {
        localVotes[vote.proposal] = {
          id: vote.id,
          voter: vote.voter,
          space: vote.space,
          proposal: vote.proposal,
          choice: vote.choice,
          vp: vote.vp,
          reason: vote.reason,
          created: vote.created,
          tx: vote.tx
        };
      });
    }

    votes.value = { ...votes.value, ...userVotes, ...localVotes };
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
