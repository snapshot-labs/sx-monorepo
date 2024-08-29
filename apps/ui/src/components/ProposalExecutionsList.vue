<script setup lang="ts">
import { buildBatchFile } from '@/helpers/safe/ build';
import { getExecutionName } from '@/helpers/ui';
import { sanitizeUrl, shorten, toBigIntOrNumber } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID, Proposal, ProposalExecution } from '@/types';

defineProps<{
  proposal: Proposal;
  executions: ProposalExecution[];
}>();

function getTreasuryExplorerUrl(networkId: NetworkID, safeAddress: string) {
  if (!safeAddress) return null;

  try {
    const network = getNetwork(networkId);

    const url = network.helpers.getExplorerUrl(safeAddress, 'address');
    return sanitizeUrl(url);
  } catch (e) {
    return null;
  }
}

function downloadExecution(execution: ProposalExecution) {
  if (!execution.chainId) return;

  const batchFile = buildBatchFile(execution.chainId, execution.transactions);

  const blob = new Blob([JSON.stringify(batchFile)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `execution-${execution.safeAddress}.json`;
  a.click();
}
</script>

<template>
  <div
    v-for="execution in executions"
    :key="`${execution.networkId}:${execution.safeAddress}`"
    class="x-block !border-x rounded-lg mb-3 last:mb-0"
  >
    <a
      :href="
        getTreasuryExplorerUrl(execution.networkId, execution.safeAddress) ||
        undefined
      "
      target="_blank"
      class="flex justify-between items-center px-4 py-3"
      :class="{
        'pointer-events-none': !getTreasuryExplorerUrl(
          execution.networkId,
          execution.safeAddress
        )
      }"
    >
      <UiBadgeNetwork :id="execution.networkId" class="mr-3">
        <UiStamp
          :id="execution.safeAddress"
          type="avatar"
          :size="32"
          class="rounded-md"
        />
      </UiBadgeNetwork>
      <div class="flex-1 leading-[22px]">
        <h4
          class="text-skin-link"
          v-text="execution.safeName || shorten(execution.safeAddress)"
        />
        <div
          class="text-skin-text text-[17px]"
          v-text="
            getExecutionName(execution.networkId, execution.strategyType) ||
            shorten(execution.safeAddress)
          "
        />
      </div>
    </a>
    <div class="flex justify-between items-center border-y pr-3">
      <UiLabel label="Transactions" class="border-b-0" />
      <button
        v-if="execution.strategyType === 'ReadOnlyExecution'"
        type="button"
        class="hover:text-skin-link p-2"
        @click="downloadExecution(execution)"
      >
        <IS-arrow-down-tray />
      </button>
    </div>
    <TransactionsListItem
      v-for="(tx, i) in execution.transactions"
      :key="i"
      :tx="tx"
      class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between"
    />
    <ProposalExecutionActions
      v-if="
        proposal.executions &&
        proposal.executions.length > 0 &&
        proposal.scores.length > 0 &&
        toBigIntOrNumber(proposal.scores_total) >=
          toBigIntOrNumber(proposal.quorum) &&
        toBigIntOrNumber(proposal.scores[0]) >
          toBigIntOrNumber(proposal.scores[1]) &&
        proposal.has_execution_window_opened
      "
      :proposal="proposal"
      :execution="execution"
    />
  </div>
</template>
