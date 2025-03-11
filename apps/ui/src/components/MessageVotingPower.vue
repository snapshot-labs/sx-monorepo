<script setup lang="ts">
import { VotingPowerItem } from '@/queries/votingPower';

defineProps<{
  votingPower: VotingPowerItem;
}>();
</script>

<template>
  <UiAlert type="error" v-bind="$attrs">
    You do not have enough voting power to vote.
  </UiAlert>
</template>
