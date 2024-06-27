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

  function reset() {
    votingPowersStore.reset();
  }

  function fetch(spaceOrProposal: Space | Proposal) {
    if (!web3.value.account) return;

    item.value = spaceOrProposal;
    votingPowersStore.fetch(item.value, web3.value.account, snapshot.value);
  }

  watch(
    () => web3.value.account,
    toAccount => {
      if (!toAccount) reset();
    }
  );

  return { votingPower, hasVoteVp, hasProposeVp, fetch, reset };
}
