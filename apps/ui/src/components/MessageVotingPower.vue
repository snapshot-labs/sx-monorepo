<script setup lang="ts">
const props = defineProps<{
  minVotingPower?: bigint;
  minProposalThreshold?: bigint;
  votingPower: {
    status: string;
    totalVotingPower: bigint;
  };
}>();

defineEmits<{
  (e: 'fetchVotingPower');
}>();

const error = computed(() => props.votingPower && props.votingPower.status === 'error');
</script>

<template>
  <div v-if="error" class="p-4 flex flex-col gap-3 items-start">
    <UiAlert type="error">There was an error fetching your voting power.</UiAlert>
    <UiButton type="button" class="flex items-center gap-2" @click="$emit('fetchVotingPower')">
      <IH-refresh />Retry
    </UiButton>
  </div>
  <UiAlert
    v-else-if="minVotingPower !== undefined && votingPower.totalVotingPower <= minVotingPower"
    type="error"
  >
    You do not have enough voting power to vote on this proposal.
  </UiAlert>
  <UiAlert
    v-else-if="
      minProposalThreshold !== undefined && votingPower.totalVotingPower < minProposalThreshold
    "
    type="error"
  >
    You do not have enough voting power to create proposal in this space.
  </UiAlert>
</template>
