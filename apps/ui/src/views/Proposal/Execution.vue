<script setup lang="ts">
import { SNAPSHOT_URLS } from '@/networks/offchain';
import { Proposal } from '@/types';

defineProps<{
  proposal: Proposal;
}>();
</script>

<template>
  <UiContainer
    v-if="
      (proposal.executions && proposal.executions.length > 0) ||
      proposal.execution_strategy_type === 'safeSnap'
    "
    class="pt-5 !max-w-[730px] mx-0 md:mx-auto"
  >
    <UiAlert
      v-if="proposal.execution_strategy_type === 'safeSnap'"
      type="warning"
    >
      This proposal uses SafeSnap execution which is currently not supported on
      the new interface. You can view execution details on the
      <AppLink
        :to="`${SNAPSHOT_URLS[proposal.network]}/#/${proposal.space.id}/proposal/${proposal.id}`"
        class="font-bold"
      >
        previous interface
      </AppLink>
      .
    </UiAlert>
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
