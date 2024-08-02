<script setup lang="ts">
import { VotingPowerItem } from '@/stores/votingPowers';

const props = defineProps<{
  minVotingPower?: bigint;
  minProposalThreshold?: bigint;
  votingPower: VotingPowerItem;
}>();

defineEmits<{
  (e: 'fetchVotingPower');
}>();

const insufficientVoteVp = computed(
  () =>
    props.votingPower.status === 'success' &&
    props.minVotingPower !== undefined &&
    props.votingPower.totalVotingPower <= props.minVotingPower
);

const insufficientProposeVp = computed(
  () =>
    props.votingPower.status === 'success' &&
    props.minProposalThreshold !== undefined &&
    props.votingPower.totalVotingPower < props.minProposalThreshold
);
</script>

<template>
  <div
    v-if="votingPower.status === 'error'"
    class="flex flex-col gap-3 items-start"
    v-bind="$attrs"
  >
    <UiAlert type="error">
      There was an error fetching your voting power.
    </UiAlert>
    <UiButton
      type="button"
      class="flex items-center gap-2"
      @click="$emit('fetchVotingPower')"
    >
      <IH-refresh />Retry
    </UiButton>
  </div>
  <UiAlert v-else-if="insufficientVoteVp" type="error">
    You do not have enough voting power to vote.
  </UiAlert>
  <UiAlert v-else-if="insufficientProposeVp" type="error">
    You do not have enough voting power to create proposal in this space.
  </UiAlert>
</template>
