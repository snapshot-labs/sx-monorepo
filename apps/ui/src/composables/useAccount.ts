import { getNetwork } from '@/networks';
import type { NetworkID, Proposal, Vote } from '@/types';

const votes = ref<Record<Proposal['id'], Vote>>({});

export function useAccount() {
  const { web3 } = useWeb3();

  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    votes.value = {};

    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account);

    votes.value = { ...votes.value, ...userVotes };
  }

  return {
    account: web3.value.account,
    votes,
    loadVotes
  };
}
