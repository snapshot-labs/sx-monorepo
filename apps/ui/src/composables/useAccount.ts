import { ref, Ref } from 'vue';
import { currentNetwork } from '@/networks';
import { useWeb3 } from '@/composables/useWeb3';
import type { Vote } from '@/types';

const votes: Ref<Record<string, Vote>> = ref({});

export function useAccount() {
  const { web3 } = useWeb3();

  async function loadVotes() {
    const account = web3.value.account;
    console.log('Load votes for', account);
    votes.value = await currentNetwork.api.loadUserVotes(account);
  }

  return { account: web3.value.account, loadVotes, votes };
}
