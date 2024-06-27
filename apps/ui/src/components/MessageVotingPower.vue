<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <div v-if="votingPower.status === 'error'" class="flex flex-col gap-3 items-start">
    <UiAlert type="error">There was an error fetching your voting power.</UiAlert>
    <UiButton type="button" class="flex items-center gap-2" @click="$emit('fetchVotingPower')">
      <IH-refresh />Retry
    </UiButton>
  </div>
  <template v-else-if="votingPower.status === 'success'">
    <UiAlert
      v-if="minVotingPower !== undefined && votingPower.totalVotingPower <= minVotingPower"
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
</template>
