<script setup lang="ts">
import { getGenericExplorerUrl } from '@/helpers/generic';
import { getProposalCurrentQuorum } from '@/helpers/quorum';
import { buildBatchFile } from '@/helpers/safe/ build';
import { getExecutionName } from '@/helpers/ui';
import { shorten, toBigIntOrNumber } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID, Proposal, ProposalExecution } from '@/types';

const props = defineProps<{
  networkId: NetworkID;
  proposal: Proposal;
  executions: ProposalExecution[];
}>();

const network = computed(() => getNetwork(props.networkId));

function downloadExecution(execution: ProposalExecution) {
  if (!execution.chainId) return;

  const batchFile = buildBatchFile(
    execution.chainId as number,
    execution.transactions
  );

  const blob = new Blob([JSON.stringify(batchFile)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `execution-${execution.safeAddress}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div
    v-for="execution in executions"
    :key="`${execution.chainId}:${execution.safeAddress}`"
    class="x-block !border-x rounded-lg mb-3 last:mb-0"
  >
    <a
      :href="
        getGenericExplorerUrl(
          execution.chainId,
          execution.safeAddress,
          'address'
        ) || undefined
      "
      target="_blank"
      class="flex justify-between items-center px-4 py-3"
      :class="{
        'pointer-events-none': !getGenericExplorerUrl(
          execution.chainId,
          execution.safeAddress,
          'address'
        )
      }"
    >
      <UiBadgeNetwork :chain-id="execution.chainId" class="mr-3 shrink-0">
        <UiStamp
          :id="execution.safeAddress"
          type="avatar"
          :size="32"
          class="rounded-md"
        />
      </UiBadgeNetwork>
      <div class="flex-1 leading-[22px] overflow-hidden">
        <h4
          class="text-skin-link truncate"
          v-text="execution.safeName || shorten(execution.safeAddress)"
        />
        <div
          class="text-skin-text text-[17px] truncate"
          v-text="getExecutionName(proposal.network, execution.strategyType)"
        />
      </div>
    </a>
    <div class="flex justify-between items-center border-y pr-3">
      <UiSectionHeader label="Transactions" class="border-b-0 pr-0 truncate" />
      <UiTooltip
        v-if="execution.strategyType === 'ReadOnlyExecution'"
        title="Export transactions"
      >
        <button
          type="button"
          class="hover:text-skin-link p-2"
          @click="downloadExecution(execution)"
        >
          <IS-arrow-down-tray />
        </button>
      </UiTooltip>
    </div>
    <TransactionsListItem
      v-for="(tx, i) in execution.transactions"
      :key="i"
      :chain-id="execution.chainId"
      :tx="tx"
    />
    <ProposalExecutionActions
      v-if="
        proposal.executions &&
        proposal.executions.length > 0 &&
        proposal.scores.length > 0 &&
        getProposalCurrentQuorum(proposal.network, proposal) >=
          proposal.quorum &&
        toBigIntOrNumber(proposal.scores[0]) >
          toBigIntOrNumber(proposal.scores[1]) &&
        proposal.has_execution_window_opened &&
        network.helpers.isExecutorActionsSupported(execution.strategyType)
      "
      :proposal="proposal"
      :execution="execution"
    />
  </div>
</template>
