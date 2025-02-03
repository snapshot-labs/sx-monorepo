<script setup lang="ts">
import dayjs from 'dayjs';
import { compareAddresses, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { ProposalExecution, Proposal as ProposalType } from '@/types';

const props = defineProps<{
  proposal: ProposalType;
  execution: ProposalExecution;
}>();

const { web3 } = useWeb3();
const {
  hasFinalize,
  hasExecuteQueued,
  fetchingDetails,
  message,
  executionTx,
  executionTxUrl,
  finalizeProposalSending,
  executeProposalSending,
  executeQueuedProposalSending,
  vetoProposalSending,
  executionCountdown,
  finalizeProposal,
  executeProposal,
  executeQueuedProposal,
  vetoProposal
} = useExecutionActions(props.proposal, props.execution);

const network = computed(() => getNetwork(props.proposal.network));
</script>

<template>
  <div class="p-3">
    <div v-if="fetchingDetails" class="flex justify-center">
      <UiLoading class="text-center" />
    </div>
    <div v-else-if="message">
      {{ message }}
    </div>
    <div v-else-if="executionTx">
      Proposal has been already executed at
      <a
        class="inline-flex items-center"
        target="_blank"
        :href="executionTxUrl || undefined"
      >
        {{ shorten(executionTx) }}
        <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
      </a>
    </div>
    <div v-else-if="proposal.veto_tx">
      Proposal has been vetoed at
      <a
        class="inline-flex items-center"
        target="_blank"
        :href="network.helpers.getExplorerUrl(proposal.veto_tx, 'transaction')"
      >
        {{ shorten(proposal.veto_tx) }}
        <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
      </a>
    </div>
    <div v-else class="space-y-2">
      <UiButton
        v-if="hasFinalize"
        class="w-full flex justify-center items-center gap-2"
        :loading="finalizeProposalSending"
        @click="finalizeProposal"
      >
        <IH-check-circle />
        Finalize proposal
      </UiButton>
      <UiButton
        v-else-if="proposal.state !== 'executed'"
        class="w-full flex justify-center items-center gap-2"
        :loading="executeProposalSending"
        @click="executeProposal"
      >
        <IH-play />
        Execute transactions
      </UiButton>
      <UiButton
        v-if="hasExecuteQueued"
        :disabled="executionCountdown > 0"
        :title="executionCountdown === 0 ? '' : 'Veto period has not ended yet'"
        class="w-full flex justify-center items-center gap-2"
        :loading="executeQueuedProposalSending"
        @click="executeQueuedProposal"
      >
        <IH-play class="shrink-0" />
        <template v-if="executionCountdown === 0"
          >Execute queued transactions</template
        >
        <template v-else>
          Execution available in
          {{ dayjs.duration(executionCountdown).format('HH:mm:ss') }}
        </template>
      </UiButton>
      <UiButton
        v-if="
          proposal.state === 'executed' &&
          !proposal.completed &&
          !proposal.vetoed &&
          proposal.timelock_veto_guardian &&
          compareAddresses(proposal.timelock_veto_guardian, web3.account)
        "
        :disabled="executionCountdown === 0"
        class="w-full flex justify-center items-center gap-2"
        :loading="vetoProposalSending"
        @click="vetoProposal"
      >
        <IH-play class="shrink-0" />
        Veto execution
      </UiButton>
    </div>
  </div>
</template>
