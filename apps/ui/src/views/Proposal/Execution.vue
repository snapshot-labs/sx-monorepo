<script setup lang="ts">
import { Proposal } from '@/types';

defineProps<{
  proposal: Proposal;
}>();
</script>

<template>
  <UiContainer
    v-if="proposal.executions && proposal.executions.length > 0"
    class="pt-5 !max-w-[730px] mx-0 md:mx-auto"
  >
    <ProposalExecutionsList
      :network-id="proposal.network"
      :proposal="proposal"
      :executions="proposal.executions"
    />
  </UiContainer>
  <UiStateWarning v-else class="px-4 py-3">
    This proposal has no executions.
  </UiStateWarning>
</template>
