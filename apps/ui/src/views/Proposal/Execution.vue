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
    class="pt-5 !max-w-[710px] mx-0 md:mx-auto"
  >
    <UiAlert
      v-if="proposal.execution_strategy_type === 'safeSnap'"
      type="warning"
    >
      This proposal uses SafeSnap execution which is currently not supported on
      the new interface. You can view execution details on the
      <a
        :href="`${SNAPSHOT_URLS[proposal.network]}/#/${proposal.space.id}/proposal/${proposal.id}`"
        target="_blank"
        class="inline-flex items-center font-bold"
      >
        previous interface
        <IH-arrow-sm-right class="inline-block -rotate-45" />
      </a>
      .
    </UiAlert>
    <ProposalExecutionsList
      :network-id="proposal.network"
      :proposal="proposal"
      :executions="proposal.executions"
    />
  </UiContainer>
  <div v-else class="px-4 py-3 flex items-center gap-2">
    <IH-exclamation-circle class="shrink-0" />
    This proposal has no executions.
  </div>
</template>
