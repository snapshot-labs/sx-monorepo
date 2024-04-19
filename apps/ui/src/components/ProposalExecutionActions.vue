<script setup lang="ts">
import dayjs from 'dayjs';
import { getNetwork } from '@/networks';
import { compareAddresses, shorten } from '@/helpers/utils';
import { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const { web3 } = useWeb3();
const {
  hasFinalize,
  finalizeProposalSending,
  executeProposalSending,
  executeQueuedProposalSending,
  vetoProposalSending,
  executionCountdown,
  finalizeProposal,
  executeProposal,
  executeQueuedProposal,
  vetoProposal
} = useExecutionActions(props.proposal);

const network = computed(() => getNetwork(props.proposal.network));
</script>

<template>
  <div class="x-block !border-x rounded-lg p-3">
    <div v-if="proposal.execution_tx">
      Proposal has been already executed at
      <a
        class="inline-flex items-center"
        target="_blank"
        :href="network.helpers.getExplorerUrl(proposal.execution_tx, 'transaction')"
      >
        {{ shorten(proposal.execution_tx) }}
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
    <template v-else>
      <UiButton
        v-if="hasFinalize"
        class="mb-2 w-full flex justify-center items-center"
        :loading="finalizeProposalSending"
        @click="finalizeProposal"
      >
        <IH-check-circle class="inline-block mr-2" />
        Finalize proposal
      </UiButton>
      <UiButton
        v-else-if="proposal.state !== 'executed'"
        class="mb-2 w-full flex justify-center items-center"
        :loading="executeProposalSending"
        @click="executeProposal"
      >
        <IH-play class="inline-block mr-2" />
        Execute proposal
      </UiButton>
      <UiButton
        v-if="proposal.state === 'executed' && !proposal.completed"
        :disabled="executionCountdown > 0"
        :title="executionCountdown === 0 ? '' : 'Veto period has not ended yet'"
        class="mb-2 w-full flex justify-center items-center"
        :loading="executeQueuedProposalSending"
        @click="executeQueuedProposal"
      >
        <IH-play class="inline-block mr-2 flex-shrink-0" />
        <template v-if="executionCountdown === 0">Execute queued transactions</template>
        <template v-else>
          Execution available in {{ dayjs.duration(executionCountdown).format('HH:mm:ss') }}
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
        class="mb-2 w-full flex justify-center items-center"
        :loading="vetoProposalSending"
        @click="vetoProposal"
      >
        <IH-play class="inline-block mr-2 flex-shrink-0" />
        Veto execution
      </UiButton>
    </template>
  </div>
</template>
