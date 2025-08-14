import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import gql from 'graphql-tag';
import { MaybeRefOrGetter } from 'vue';
import { getGenericExplorerUrl } from '@/helpers/generic';
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
  proposal: MaybeRefOrGetter<Proposal>,
  execution: MaybeRefOrGetter<ProposalExecution>
) {
  const actions = useActions();

  const currentTimestamp = ref(Date.now());
  const isL1ExecutionReady = ref(false);

  const fetchingDetails = ref(false);
  const executionTx = ref<string | null>(null);
  const message: Ref<string | null> = ref(null);
  const executionNetwork = ref<Network>(getNetwork(toValue(proposal).network));
  const finalizeProposalSending = ref(false);
  const executeProposalSending = ref(false);
  const executeQueuedProposalSending = ref(false);
  const vetoProposalSending = ref(false);

  const { pause } = useIntervalFn(() => {
    const proposalValue = toValue(proposal);

    if (
      proposalValue.state === 'queued' &&
      currentTimestamp.value > proposalValue.execution_time * 1000
    ) {
      pause();
    }

    currentTimestamp.value = Date.now();
  }, 1000);

  const network = computed(() => getNetwork(toValue(proposal).network));
  const hasFinalize = computed(
    () =>
      STRATEGIES_WITH_FINALIZE.includes(toValue(execution).strategyType) &&
      !toValue(proposal).execution_ready
  );
  const hasExecuteQueued = computed(() => {
    const executionValue = toValue(execution);
    const proposalValue = toValue(proposal);

    if (executionValue.strategyType === 'EthRelayer') {
      return proposalValue.state === 'executed'
        ? isL1ExecutionReady.value
        : false;
    }

    return proposalValue.state === 'queued';
  });

  const executionCountdown = computed(() => {
    return Math.max(
      toValue(proposal).execution_time * 1000 - currentTimestamp.value,
      0
    );
  });

  const executionTxUrl = computed(() => {
    if (!executionTx.value) return null;

    return getGenericExplorerUrl(
      toValue(execution).chainId,
      executionTx.value,
      'transaction'
    );
  });

  async function fetchEthRelayerExecutionDetails() {
    const proposalValue = toValue(proposal);

    if (currentTimestamp.value < proposalValue.max_end * 1000) {
      message.value =
        'This execution strategy requires max end time to be reached.';
    }

    if (!proposalValue.execution_tx) return;

    const tx = await network.value.helpers.getTransaction(
      proposalValue.execution_tx
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
      variables: {
        id: `${proposalValue.space.id}/${proposalValue.proposal_id}`
      }
    });

    if (!data.starknetL1Execution) {
      isL1ExecutionReady.value = true;
    } else {
      executionTx.value = data.starknetL1Execution.tx;
      executionNetwork.value = baseNetwork;
    }
  }

  async function fetchOSnapExecutionDetails() {
    const executionValue = toValue(execution);

    try {
      if (
        !executionValue.chainId ||
        typeof executionValue.chainId !== 'number'
      ) {
        throw new Error('Chain ID is required for oSnap execution');
      }

      const proposalHash = getProposalHashFromTransactions(
        executionValue.transactions
      );
      const moduleAddress = await getModuleAddressForTreasury(
        executionValue.chainId,
        executionValue.safeAddress
      );

      const data = await getOgProposalGql({
        chainId: executionValue.chainId,
        explanation: toValue(proposal).metadata_uri,
        moduleAddress,
        proposalHash
      });

      if (!data) {
        const configCompliant = await isConfigCompliant(
          executionValue.safeAddress,
          executionValue.chainId
        );

        message.value = configCompliant.automaticExecution
          ? 'Waiting for execution to be initiated.'
          : 'Space is not configured for automatic execution.';
      } else if (data.executionTransactionHash) {
        try {
          executionTx.value = data.executionTransactionHash;
        } catch {
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
      await actions.finalizeProposal(toValue(proposal));
    } finally {
      finalizeProposalSending.value = false;
    }
  }

  async function executeProposal() {
    executeProposalSending.value = true;

    try {
      await actions.executeTransactions(toValue(proposal));
    } finally {
      executeProposalSending.value = false;
    }
  }

  async function executeQueuedProposal() {
    executeQueuedProposalSending.value = true;

    try {
      await actions.executeQueuedProposal(toValue(proposal));
    } finally {
      executeQueuedProposalSending.value = false;
    }
  }

  async function vetoProposal() {
    vetoProposalSending.value = true;

    try {
      await actions.vetoProposal(toValue(proposal));
    } finally {
      vetoProposalSending.value = false;
    }
  }

  watch(
    () => toValue(proposal),
    async proposal => {
      const executionValue = toValue(execution);

      const isEthRelayer = executionValue.strategyType === 'EthRelayer';
      const hasExternalDetails = STRATEGIES_WITH_EXTERNAL_DETAILS.includes(
        executionValue.strategyType
      );

      executionTx.value = !isEthRelayer ? proposal.execution_tx : null;

      if (!hasExternalDetails) return;

      fetchingDetails.value = isEthRelayer ? !!proposal.execution_tx : true;

      try {
        if (isEthRelayer) {
          await fetchEthRelayerExecutionDetails();
        } else if (executionValue.strategyType === 'oSnap') {
          await fetchOSnapExecutionDetails();
        } else {
          throw new Error('Unsupported strategy');
        }
      } finally {
        fetchingDetails.value = false;
      }
    },
    { immediate: true }
  );

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
