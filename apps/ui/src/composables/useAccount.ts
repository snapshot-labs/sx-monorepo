import { getNetwork, offchainNetworks } from '@/networks';
import type { NetworkID, Proposal, Vote } from '@/types';

const votes = ref<Record<Proposal['id'], Vote>>({});

export function useAccount() {
  const { web3, web3Account } = useWeb3();

  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(
      spaceIds.map(id => (offchainNetworks.includes(networkId) ? id.split(':')[1] : id)),
      account
    );

    votes.value = { ...votes.value, ...userVotes };
  }

  watchEffect(() => {
    if (!web3Account.value) votes.value = {};
  });

  return {
    account: web3.value.account,
    votes,
    loadVotes
  };
}
