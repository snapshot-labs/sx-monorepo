import { getNetwork, offchainNetworks } from '@/networks';
import { STARKNET_CONNECTORS } from '@/networks/common/constants';
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

    // On starknet account, we don't load votes for offchain networks (unsupported)
    if (
      STARKNET_CONNECTORS.includes(auth.value.connector.type) &&
      offchainNetworks.includes(networkId)
    )
      return;

    const account = auth.value.account;
    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account, {
      limit: VOTES_LIMIT
    });

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
