import { ref, Ref } from 'vue';
import { enabledNetworks, getNetwork } from '@/networks';
import { useWeb3 } from '@/composables/useWeb3';
import type { Vote } from '@/types';

const votes: Ref<Record<string, Vote>> = ref({});

export function useAccount() {
  const { web3 } = useWeb3();

  async function loadVotes() {
    const account = web3.value.account;
    console.log('Load votes for', account);

    const allNetworkVotes = await Promise.all(
      enabledNetworks.map(networkId => {
        const network = getNetwork(networkId);
        return network.api.loadUserVotes(account);
      })
    );

    votes.value = allNetworkVotes.reduce((acc, b) => ({ ...acc, ...b }));
  }

  return { account: web3.value.account, loadVotes, votes };
}
