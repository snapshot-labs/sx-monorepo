<script setup lang="ts">
import { Interface, JsonFragment } from '@ethersproject/abi';
import { getABI } from '@/helpers/etherscan';
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

async function tryDecodeRawTransactions(
  execution: ProposalExecution
): Promise<ProposalExecution> {
  const rawTxs = execution.transactions.filter(
    tx => tx._type === 'raw' && tx.data && tx.data !== '0x'
  );
  if (!rawTxs.length) return execution;

  const uniqueAddresses = [...new Set(rawTxs.map(tx => tx.to))];

  const abiMap: Record<string, JsonFragment[] | null> = Object.fromEntries(
    await Promise.all(
      uniqueAddresses.map(async address => [
        address,
        await getABI(Number(execution.chainId), address).catch(() => null)
      ])
    )
  );

  const transactions = execution.transactions.map(tx => {
    const abi = tx._type === 'raw' ? abiMap[tx.to] : null;
    if (!abi) return tx;

    try {
      const iface = new Interface(abi);
      const parsed = iface.parseTransaction({ data: tx.data });
      const args: Record<string, string> = {};

      iface.getFunction(parsed.name).inputs.forEach((input, i) => {
        args[input.name || `param${i}`] = String(parsed.args[i]);
      });

      return {
        ...tx,
        _type: 'contractCall' as const,
        _form: { recipient: tx.to, method: parsed.signature, args, abi }
      };
    } catch {
      return tx;
    }
  });

  return { ...execution, transactions };
}

const decodedExecutions = computedAsync(
  () => Promise.all(props.executions.map(tryDecodeRawTransactions)),
  props.executions
);

function downloadExecution(execution: ProposalExecution) {
  const batchFile = buildBatchFile(
    Number(execution.chainId),
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
    v-for="execution in decodedExecutions"
    :key="`${execution.chainId}:${execution.safeAddress}`"
    class="x-block !border-x rounded-lg mb-3 last:mb-0"
  >
    <AppLink
      :to="
        getGenericExplorerUrl(
          execution.chainId,
          execution.safeAddress,
          'address'
        ) || undefined
      "
      class="flex justify-between items-center px-4 py-3"
      :class="{
        'pointer-events-none text-left': !getGenericExplorerUrl(
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
    </AppLink>
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
