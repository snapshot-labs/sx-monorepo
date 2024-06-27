import type { Space, Proposal } from '@/types';

export function useVotingPower() {
  const { web3 } = useWeb3();
  const votingPowersStore = useVotingPowersStore();

  const item = ref<Space | Proposal | undefined>();

  const space = computed(() =>
    item.value && 'space' in item.value ? (item.value?.space as Space) : item.value
  );

  const snapshot = computed(() =>
    item.value && 'snapshot' in item.value ? item.value.snapshot : undefined
  );

  const votingPower = computed(
    () => space.value && votingPowersStore.get(space.value, snapshot.value)
  );

  const hasVoteVp = computed(
    () => (votingPower.value && votingPower.value.totalVotingPower > 0n) || false
  );

  const hasProposeVp = computed(
    () =>
      (votingPower.value &&
        space.value &&
        votingPower.value.totalVotingPower >= BigInt(space.value.proposal_threshold)) ||
      false
  );

  function fetch(spaceOrProposal: Space | Proposal) {
    item.value = spaceOrProposal;

    votingPowersStore.fetch(item.value, web3.value.account, snapshot.value);
  }

  watch(
    () => web3.value.account,
    (toAccount, fromAccount) => {
      if (toAccount === fromAccount) return;

      console.log('resetting voting power on user change');
      votingPowersStore.reset();
    }
  );

  return { votingPower, fetch, hasVoteVp, hasProposeVp };
}
