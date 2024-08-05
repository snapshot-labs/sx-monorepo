<script setup lang="ts">
import { VotingPowerItem } from '@/stores/votingPowers';

defineProps<{
  votingPower: VotingPowerItem;
  action?: 'vote' | 'propose';
}>();

defineEmits<{
  (e: 'fetchVotingPower');
}>();
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
  <template v-else-if="votingPower.status === 'success'">
    <UiAlert
      v-if="action === 'vote' && !votingPower.canVote"
      type="error"
      v-bind="$attrs"
    >
      You do not have enough voting power to vote.
    </UiAlert>
    <UiAlert
      v-else-if="action === 'propose' && !votingPower.canPropose"
      type="error"
      v-bind="$attrs"
    >
      You do not have enough voting power to create proposal in this space.
    </UiAlert>
  </template>
</template>
