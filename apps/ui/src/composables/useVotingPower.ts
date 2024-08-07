import { supportsNullCurrent } from '@/networks';
import { getIndex as getVotingPowerIndex } from '@/stores/votingPowers';
import { Proposal, Space } from '@/types';

export function useVotingPower() {
  const votingPowersStore = useVotingPowersStore();
  const { web3 } = useWeb3();
  const { getCurrent } = useMetaStore();

  const item = ref<Space | Proposal | undefined>();
  const block = ref<number | null>(null);

  const space = computed(() =>
    item.value && 'space' in item.value
      ? (item.value?.space as Space)
      : item.value
  );

  const proposal = computed(() =>
    item.value && 'snapshot' in item.value
      ? (item.value as Proposal)
      : undefined
  );

  const proposalSnapshot = computed(() => {
    if (!proposal.value) return null;

    return proposal.value.state === 'pending' ? null : proposal.value.snapshot;
  });

  const votingPower = computed(
    () =>
      space.value &&
      votingPowersStore.votingPowers.get(
        getVotingPowerIndex(space.value, block.value)
      )
  );

  function latestBlock(space: Space) {
    return supportsNullCurrent(space.network)
      ? null
      : getCurrent(space.network) ?? 0;
  }

  function reset() {
    votingPowersStore.reset();
  }

  function fetch(spaceOrProposal: Space | Proposal) {
    if (!web3.value.account) return;

    item.value = spaceOrProposal;
    block.value = proposal.value
      ? proposalSnapshot.value
      : latestBlock(space.value as Space);

    votingPowersStore.fetch(item.value, web3.value.account, block.value);
  }

  watch(
    () => web3.value.account,
    account => {
      if (!account) reset();
    }
  );

  return { votingPower, fetch, reset };
}
