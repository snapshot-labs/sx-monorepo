import { getNetwork } from '@/networks';
import type { NetworkID, Vote } from '@/types';

const votes: Ref<Record<string, Vote>> = ref({});

export function useAccount() {
  const { web3, web3Account } = useWeb3();

  watchEffect(() => {
    if (!web3Account.value) votes.value = {};
  });

  async function loadVotes(networkId: NetworkID, spaceId: string) {
    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceId, account);

    votes.value = { ...votes.value, ...userVotes };
  }

  return { account: web3.value.account, loadVotes, votes };
}
