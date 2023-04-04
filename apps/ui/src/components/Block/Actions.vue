<script setup lang="ts">
import { getNetwork } from '@/networks';
import { shorten } from '@/helpers/utils';
import type { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const { finalizeProposal, receiveProposal, executeTransactions, executeQueuedProposal } =
  useActions();

const finalizeProposalSending = ref(false);
const receiveProposalSending = ref(false);
const executeTransactionsSending = ref(false);
const executeQueuedProposalSending = ref(false);

const network = computed(() => getNetwork(props.proposal.network));
const baseNetwork = computed(() =>
  network.value.baseNetworkId ? getNetwork(network.value.baseNetworkId) : network.value
);

async function handleFinalizeProposalClick() {
  finalizeProposalSending.value = true;

  try {
    await finalizeProposal(props.proposal);
  } finally {
    finalizeProposalSending.value = false;
  }
}

async function handleReceiveProposalClick() {
  receiveProposalSending.value = true;

  try {
    await receiveProposal(props.proposal);
  } finally {
    receiveProposalSending.value = false;
  }
}

async function handleExecuteTransactionsClick() {
  executeTransactionsSending.value = true;

  try {
    await executeTransactions(props.proposal);
  } finally {
    executeTransactionsSending.value = false;
  }
}

async function handleExecuteQueuedProposalClick() {
  executeQueuedProposalSending.value = true;

  try {
    await executeQueuedProposal(props.proposal);
  } finally {
    executeQueuedProposalSending.value = false;
  }
}
</script>

<template>
  <div class="x-block !border-x rounded-lg p-3">
    <div v-if="proposal.execution_tx">
      Proposal has been already executed at
      <a
        class="inline-flex items-center"
        target="_blank"
        :href="baseNetwork.helpers.getExplorerUrl(proposal.execution_tx, 'transaction')"
      >
        {{ shorten(proposal.execution_tx) }}
        <IH-external-link class="inline-block ml-1"
      /></a>
    </div>
    <template v-else>
      <UiButton
        v-if="network.hasReceive"
        class="block mb-2 w-full flex justify-center items-center"
        :loading="finalizeProposalSending"
        @click="handleFinalizeProposalClick"
      >
        <IH-check-circle class="inline-block mr-2" />
        Finalize proposal
      </UiButton>
      <UiButton
        v-if="network.hasReceive"
        class="block mb-2 w-full flex justify-center items-center"
        :loading="receiveProposalSending"
        @click="handleReceiveProposalClick"
      >
        <IH-database class="inline-block mr-2" />
        Receive proposal
      </UiButton>
      <UiButton
        v-if="!proposal.executed"
        class="block mb-2 w-full flex justify-center items-center"
        :loading="executeTransactionsSending"
        @click="handleExecuteTransactionsClick"
      >
        <IH-play class="inline-block mr-2" />
        Execute proposal
      </UiButton>
      <UiButton
        v-if="proposal.executed && !proposal.completed"
        :disabled="!proposal.has_veto_period_ended"
        :title="proposal.has_veto_period_ended ? '' : 'Veto period has not ended yet'"
        class="block mb-2 w-full flex justify-center items-center"
        :loading="executeQueuedProposalSending"
        @click="handleExecuteQueuedProposalClick"
      >
        <IH-play class="inline-block mr-2" />
        Execute queued transactions
      </UiButton>
    </template>
  </div>
</template>
