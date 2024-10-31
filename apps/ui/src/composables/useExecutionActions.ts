import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { getGenericExplorerUrl } from '@/helpers/explorer';
import {
  getModuleAddressForTreasury,
  getOgProposalGql,
  getProposalHashFromTransactions,
  isConfigCompliant
} from '@/helpers/osnap/getters';
import { getNetwork } from '@/networks';
import { Network } from '@/networks/types';
import { Proposal, ProposalExecution } from '@/types';

export const STARKNET_L1_EXECUTION_QUERY = gql`
  query ($id: String!) {
    starknetL1Execution(id: $id) {
      tx
    }
  }
`;

const STRATEGIES_WITH_FINALIZE = ['Axiom'];
const STRATEGIES_WITH_EXTERNAL_DETAILS = ['EthRelayer', 'oSnap'];

export function useExecutionActions(
  proposal: Proposal,
  execution: ProposalExecution
) {
  const actions = useActions();

  const currentTimestamp = ref(Date.now());
  const isL1ExecutionReady = ref(false);

  const fetchingDetails = ref(
    STRATEGIES_WITH_EXTERNAL_DETAILS.includes(execution.strategyType) &&
      (execution.strategyType === 'EthRelayer' ? proposal.execution_tx : true)
  );
  const message: Ref<string | null> = ref(null);
  const executionTx = ref<string | null>(
    execution.strategyType !== 'EthRelayer' ? proposal.execution_tx : null
  );
  const executionNetwork = ref<Network>(getNetwork(proposal.network));
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
      STRATEGIES_WITH_FINALIZE.includes(execution.strategyType) &&
      !proposal.execution_ready
  );
  const hasExecuteQueued = computed(() => {
    if (execution.strategyType === 'EthRelayer') {
      return proposal.state === 'executed' ? isL1ExecutionReady.value : false;
    }

    return proposal.state === 'executed' && !proposal.completed;
  });

  const executionCountdown = computed(() => {
    return Math.max(proposal.execution_time * 1000 - currentTimestamp.value, 0);
  });

  const executionTxUrl = computed(() => {
    if (!executionTx.value) return null;

    return getGenericExplorerUrl(
      execution.chainId,
      executionTx.value,
      'transaction'
    );
  });

  async function fetchEthRelayerExecutionDetails() {
    if (currentTimestamp.value < proposal.max_end * 1000) {
      message.value =
        'This execution strategy requires max end time to be reached.';
    }

    if (!proposal.execution_tx) return;

    const tx = await network.value.helpers.getTransaction(
      proposal.execution_tx
    );
    if (tx.finality_status !== 'ACCEPTED_ON_L1') {
      message.value = 'Waiting for execution to be received on L1.';
      return;
    }

    if (!network.value.baseNetworkId) throw new Error('Base network not found');
    const baseNetwork = getNetwork(network.value.baseNetworkId);

    const httpLink = createHttpLink({ uri: baseNetwork.api.apiUrl });
    const apollo = new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache({
        addTypename: false
      }),
      defaultOptions: {
        query: {
          fetchPolicy: 'no-cache'
        }
      }
    });

    const { data } = await apollo.query({
      query: STARKNET_L1_EXECUTION_QUERY,
      variables: { id: `${proposal.space.id}/${proposal.proposal_id}` }
    });

    if (!data.starknetL1Execution) {
      isL1ExecutionReady.value = true;
    } else {
      executionTx.value = data.starknetL1Execution.tx;
      executionNetwork.value = baseNetwork;
    }
  }

  async function fetchOSnapExecutionDetails() {
    try {
      if (!execution.chainId || typeof execution.chainId !== 'number') {
        throw new Error('Chain ID is required for oSnap execution');
      }

      const proposalHash = getProposalHashFromTransactions(
        execution.transactions
      );
      const moduleAddress = await getModuleAddressForTreasury(
        execution.chainId,
        execution.safeAddress
      );

      const data = await getOgProposalGql({
        chainId: execution.chainId,
        explanation: proposal.metadata_uri,
        moduleAddress,
        proposalHash
      });

      if (!data) {
        const configCompliant = await isConfigCompliant(
          execution.safeAddress,
          execution.chainId
        );

        message.value = configCompliant.automaticExecution
          ? 'Waiting for execution to be initiated.'
          : 'Space is not configured for automatic execution.';
      } else if (data.executionTransactionHash) {
        try {
          executionTx.value = data.executionTransactionHash;
        } catch (e) {
          message.value =
            'Proposal has been executed but execution details are not available.';
        }
      } else {
        message.value = 'Waiting for execution to be confirmed.';
      }
    } catch (e) {
      console.warn(e);
      message.value = 'Execution details failed to load.';
    }
  }

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
    if (!STRATEGIES_WITH_EXTERNAL_DETAILS.includes(execution.strategyType)) {
      return;
    }

    try {
      if (execution.strategyType === 'EthRelayer') {
        await fetchEthRelayerExecutionDetails();
      } else if (execution.strategyType === 'oSnap') {
        await fetchOSnapExecutionDetails();
      } else {
        throw new Error('Unsupported strategy');
      }
    } finally {
      fetchingDetails.value = false;
    }
  });

  return {
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
  };
}
