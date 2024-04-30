import { Proposal } from '@/types';

const STRATEGIES_WITH_FINALIZE = ['Axiom'];

export function useExecutionActions(proposal: Proposal) {
  const actions = useActions();

  const currentTimestamp = ref(Date.now());

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

  const hasFinalize = computed(
    () =>
      STRATEGIES_WITH_FINALIZE.includes(proposal.execution_strategy_type) &&
      !proposal.execution_ready
  );
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

  return {
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
  };
}
