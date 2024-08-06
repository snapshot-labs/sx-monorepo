<script setup lang="ts">
import { sanitizeUrl, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID, ProposalExecution } from '@/types';

defineProps<{ executions: ProposalExecution[] }>();

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

function getExecutionType(networkId: NetworkID, strategyType: string) {
  try {
    if (strategyType === 'oSnap') return 'oSnap execution';

    const network = getNetwork(networkId);
    return `${network.constants.EXECUTORS[strategyType]} execution`;
  } catch (e) {
    return null;
  }
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
            getExecutionType(execution.networkId, execution.strategyType) ||
            shorten(execution.safeAddress)
          "
        />
      </div>
    </a>
    <UiLabel label="Transactions" class="border-t" />
    <TransactionsListItem
      v-for="(tx, i) in execution.transactions"
      :key="i"
      :tx="tx"
      class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between"
    />
  </div>
</template>
