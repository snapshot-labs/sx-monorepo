import { getNetwork } from '@/networks';
import type { NetworkID, Proposal, Space, Vote } from '@/types';

const votes: Ref<Record<Proposal['id'], Vote>> = ref({});
const follows: Ref<Space['id'][]> = ref([]);

export function useAccount() {
  const { web3, web3Account } = useWeb3();

  watchEffect(() => {
    if (!web3Account.value) votes.value = {};
  });

  async function loadVotes(networkId: NetworkID, spaceIds: string[]) {
    const account = web3.value.account;
    if (!account) return;

    const network = getNetwork(networkId);
    const userVotes = await network.api.loadUserVotes(spaceIds, account);

    votes.value = { ...votes.value, ...userVotes };
  }

  async function loadFollows(networkId: NetworkID) {
    const { account, type } = web3.value;
    if (!account || type === 'argentx') {
      follows.value = [];
      return;
    }

    const network = getNetwork(networkId);
    follows.value = (await network.api.loadFollows(account)).map(follow => follow.space.id);
  }

  return { account: web3.value.account, loadVotes, loadFollows, votes, follows };
}
