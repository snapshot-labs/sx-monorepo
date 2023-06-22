<script setup lang="ts">
import dayjs from 'dayjs';
import { useIntervalFn } from '@vueuse/core';
import { getNetwork } from '@/networks';
import { compareAddresses, shorten } from '@/helpers/utils';
import { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const { web3 } = useWeb3();
const {
  finalizeProposal,
  receiveProposal,
  executeTransactions,
  executeQueuedProposal,
  vetoProposal
} = useActions();

const finalizeProposalSending = ref(false);
const receiveProposalSending = ref(false);
const executeTransactionsSending = ref(false);
const executeQueuedProposalSending = ref(false);
const vetoProposalSending = ref(false);
const currentTimestamp = ref(Date.now());

const network = computed(() => getNetwork(props.proposal.network));
const baseNetwork = computed(() =>
  network.value.baseNetworkId ? getNetwork(network.value.baseNetworkId) : network.value
);

const { pause } = useIntervalFn(() => {
  if (currentTimestamp.value > props.proposal.execution_time * 1000) {
    pause();
  }

  currentTimestamp.value = Date.now();
}, 1000);

const countdown = computed(() => {
  return Math.max(props.proposal.execution_time * 1000 - currentTimestamp.value, 0);
});

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

async function handleVetoProposalClick() {
  vetoProposalSending.value = true;

  try {
    await vetoProposal(props.proposal);
  } finally {
    vetoProposalSending.value = false;
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
    <div v-else-if="proposal.veto_tx">
      Proposal has been vetoed at
      <a
        class="inline-flex items-center"
        target="_blank"
        :href="baseNetwork.helpers.getExplorerUrl(proposal.veto_tx, 'transaction')"
      >
        {{ shorten(proposal.veto_tx) }}
        <IH-external-link class="inline-block ml-1"
      /></a>
    </div>
    <template v-else>
      <UiButton
        v-if="network.hasReceive"
        class="mb-2 w-full flex justify-center items-center"
        :loading="finalizeProposalSending"
        @click="handleFinalizeProposalClick"
      >
        <IH-check-circle class="inline-block mr-2" />
        Finalize proposal
      </UiButton>
      <UiButton
        v-if="network.hasReceive"
        class="mb-2 w-full flex justify-center items-center"
        :loading="receiveProposalSending"
        @click="handleReceiveProposalClick"
      >
        <IH-database class="inline-block mr-2" />
        Receive proposal
      </UiButton>
      <UiButton
        v-if="!proposal.executed"
        class="mb-2 w-full flex justify-center items-center"
        :loading="executeTransactionsSending"
        @click="handleExecuteTransactionsClick"
      >
        <IH-play class="inline-block mr-2" />
        Execute proposal
      </UiButton>
      <UiButton
        v-if="proposal.executed && !proposal.completed"
        :disabled="countdown > 0"
        :title="countdown === 0 ? '' : 'Veto period has not ended yet'"
        class="mb-2 w-full flex justify-center items-center"
        :loading="executeQueuedProposalSending"
        @click="handleExecuteQueuedProposalClick"
      >
        <IH-play class="inline-block mr-2 flex-shrink-0" />
        <template v-if="countdown === 0">Execute queued transactions</template>
        <template v-else>
          Execution available in {{ dayjs.duration(countdown).format('HH:mm:ss') }}
        </template>
      </UiButton>
      <UiButton
        v-if="
          proposal.executed &&
          !proposal.completed &&
          !proposal.vetoed &&
          proposal.timelock_veto_guardian &&
          compareAddresses(proposal.timelock_veto_guardian, web3.account)
        "
        :disabled="countdown === 0"
        class="mb-2 w-full flex justify-center items-center"
        :loading="vetoProposalSending"
        @click="handleVetoProposalClick"
      >
        <IH-play class="inline-block mr-2 flex-shrink-0" />
        Veto execution
      </UiButton>
    </template>
  </div>
</template>
