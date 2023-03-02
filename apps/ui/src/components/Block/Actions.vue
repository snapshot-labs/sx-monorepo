<script setup lang="ts">
import { ref } from 'vue';
import { useActions } from '@/composables/useActions';
import { getNetwork } from '@/networks';
import type { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const { finalizeProposal, receiveProposal, executeTransactions } = useActions();

const finalizeProposalSending = ref(false);
const receiveProposalSending = ref(false);
const executeTransactionsSending = ref(false);

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
</script>

<template>
  <div class="x-block !border-x rounded-lg p-3">
    <div v-if="proposal.executed">Proposal has been already executed</div>
    <template v-else>
      <UiButton
        v-if="getNetwork(proposal.network).hasReceive"
        class="block mb-2 w-full flex justify-center items-center"
        :loading="finalizeProposalSending"
        @click="handleFinalizeProposalClick"
      >
        <IH-check-circle class="inline-block mr-2" />
        Finalize proposal
      </UiButton>
      <UiButton
        v-if="getNetwork(proposal.network).hasReceive"
        class="block mb-2 w-full flex justify-center items-center"
        :loading="receiveProposalSending"
        @click="handleReceiveProposalClick"
      >
        <IH-database class="inline-block mr-2" />
        Receive proposal
      </UiButton>
      <UiButton
        class="block mb-2 w-full flex justify-center items-center"
        :loading="executeTransactionsSending"
        @click="handleExecuteTransactionsClick"
      >
        <IH-play class="inline-block mr-2" />
        Execute transactions
      </UiButton>
    </template>
  </div>
</template>
