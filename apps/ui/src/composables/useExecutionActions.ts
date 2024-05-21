import { getNetwork } from '@/networks';
import { Proposal } from '@/types';

const STRATEGIES_WITH_FINALIZE = ['Axiom'];
const STRATEGIES_WITH_EXTERNAL_DETAILS = ['EthRelayer'];

export function useExecutionActions(proposal: Proposal) {
  const actions = useActions();

  const currentTimestamp = ref(Date.now());
  const isL1ExecutionReady = ref(false);

  const fetchingDetails = ref(
    STRATEGIES_WITH_EXTERNAL_DETAILS.includes(proposal.execution_strategy_type) &&
      proposal.execution_tx
  );
  const message: Ref<string | null> = ref(null);
  const finalizeProposalSending = ref(false);
  const executeProposalSending = ref(false);
  const executeQueuedProposalSending = ref(false);
  const vetoProposalSending = ref(false);

  const { pause } = useIntervalFn(() => {
    if (currentTimestamp.value > proposal.execution_time * 1000) {
      pause();
    }

    currentTimestamp.value = Date.now();
  }, 1000);

  const network = computed(() => getNetwork(proposal.network));
  const hasFinalize = computed(
    () =>
      STRATEGIES_WITH_FINALIZE.includes(proposal.execution_strategy_type) &&
      !proposal.execution_ready
  );
  const hasExecuteQueued = computed(() => {
    if (proposal.execution_strategy_type === 'EthRelayer') {
      return proposal.state === 'executed' ? isL1ExecutionReady.value : false;
    }

    return !proposal.completed;
  });

  const executionCountdown = computed(() => {
    return Math.max(proposal.execution_time * 1000 - currentTimestamp.value, 0);
  });

  async function finalizeProposal() {
    finalizeProposalSending.value = true;

    try {
      await actions.finalizeProposal(proposal);
    } finally {
      finalizeProposalSending.value = false;
    }
  }

  async function executeProposal() {
    executeProposalSending.value = true;

    try {
      await actions.executeTransactions(proposal);
    } finally {
      executeProposalSending.value = false;
    }
  }

  async function executeQueuedProposal() {
    executeQueuedProposalSending.value = true;

    try {
      await actions.executeQueuedProposal(proposal);
    } finally {
      executeQueuedProposalSending.value = false;
    }
  }

  async function vetoProposal() {
    vetoProposalSending.value = true;

    try {
      await actions.vetoProposal(proposal);
    } finally {
      vetoProposalSending.value = false;
    }
  }

  onMounted(async () => {
    if (!STRATEGIES_WITH_EXTERNAL_DETAILS.includes(proposal.execution_strategy_type)) return;
    if (!proposal.execution_tx) return;

    const tx = await network.value.helpers.getTransaction(proposal.execution_tx);
    if (tx.finality_status === 'ACCEPTED_ON_L1') {
      isL1ExecutionReady.value = true;
    } else {
      message.value = 'Waiting for execution to be received on L1.';
    }

    fetchingDetails.value = false;
  });

  return {
    hasFinalize,
    hasExecuteQueued,
    fetchingDetails,
    message,
    finalizeProposalSending,
    executeProposalSending,
    executeQueuedProposalSending,
    vetoProposalSending,
    executionCountdown,
    finalizeProposal,
    executeProposal,
    executeQueuedProposal,
    vetoProposal
  };
}
