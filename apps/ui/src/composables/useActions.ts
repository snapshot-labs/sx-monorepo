import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { getNetwork, evmNetworks } from '@/networks';
import { useUiStore } from '@/stores/ui';
import { useWeb3 } from '@/composables/useWeb3';
import { useModal } from '@/composables/useModal';
import type {
  Transaction,
  Proposal,
  SpaceMetadata,
  SpaceSettings,
  Space,
  Choice,
  NetworkID
} from '@/types';
import type { Connector, StrategyConfig } from '@/networks/types';

export function useActions() {
  const uiStore = useUiStore();
  const { web3 } = useWeb3();
  const { modalAccountOpen } = useModal();
  const auth = getInstance();

  function wrapWithErrors(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        if (err.code !== 'ACTION_REJECTED' && err.message !== 'User abort') {
          uiStore.addNotification('error', 'Something went wrong. Please try again later.');
        }

        throw err;
      }
    };
  }

  async function wrapPromise(networkId: NetworkID, promise: Promise<any>) {
    const network = getNetwork(networkId);

    const envelope = await promise;
    console.log('envelope', envelope);

    // TODO: unify send/soc to both return txHash under same property
    if (envelope.signatureData || envelope.sig) {
      const receipt = await network.actions.send(envelope);

      console.log('Receipt', receipt);
      uiStore.addPendingTransaction(receipt.transaction_hash || receipt.hash, networkId);
    } else {
      uiStore.addPendingTransaction(envelope.hash, networkId);
    }
  }

  async function forceLogin() {
    modalAccountOpen.value = true;
  }

  async function createSpace(
    networkId: NetworkID,
    metadata: SpaceMetadata,
    settings: SpaceSettings,
    authenticators: StrategyConfig[],
    validationStrategy: StrategyConfig,
    votingStrategies: StrategyConfig[],
    executionStrategies: StrategyConfig[]
  ) {
    if (!web3.value.account) {
      forceLogin();
      return false;
    }

    const network = getNetwork(networkId);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    const receipt = await network.actions.createSpace(auth.web3, {
      controller: web3.value.account,
      votingDelay: settings.votingDelay,
      minVotingDuration: settings.minVotingDuration,
      maxVotingDuration: settings.maxVotingDuration,
      proposalThreshold: BigInt(settings.proposalThreshold),
      ...(!evmNetworks.includes(networkId) && settings.quorum
        ? { quorum: BigInt(settings.quorum) }
        : {}),
      authenticators,
      validationStrategy,
      votingStrategies,
      executionStrategies,
      metadata
    });

    console.log('Receipt', receipt);
    uiStore.addPendingTransaction(receipt.transaction_hash || receipt.hash, networkId);

    return true;
  }

  async function updateMetadata(space: Space, metadata: SpaceMetadata) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    const receipt = await network.actions.setMetadata(auth.web3, space, metadata);

    console.log('Receipt', receipt);
    uiStore.addPendingTransaction(receipt.transaction_hash || receipt.hash, space.network);
  }

  async function vote(proposal: Proposal, choice: Choice) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.vote(auth.web3, web3.value.account, proposal, choice)
    );
  }

  async function propose(
    space: Space,
    title: string,
    body: string,
    discussion: string,
    execution: Transaction[]
  ) {
    if (!web3.value.account) {
      forceLogin();
      return false;
    }
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(space.network);

    const transactions = execution.map((tx: Transaction) => ({
      ...tx,
      nonce: 0,
      operation: 0
    }));

    const pinned = await network.helpers.pin({
      title,
      body,
      discussion,
      execution: transactions
    });
    if (!pinned || !pinned.cid) return false;
    console.log('IPFS', pinned);

    await wrapPromise(
      space.network,
      network.actions.propose(auth.web3, web3.value.account, space, pinned.cid, transactions)
    );

    return true;
  }

  async function finalizeProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);

    const receipt = await network.actions.finalizeProposal(auth.web3, proposal);

    console.log('Receipt', receipt);
    uiStore.addPendingTransaction(receipt.transaction_hash || receipt.hash, proposal.network);
  }

  async function receiveProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);
    if (!network.hasReceive) throw new Error('Receive on this network is not supported');

    const receipt = await network.actions.receiveProposal(auth.web3, proposal);
    console.log('Receipt', receipt);

    uiStore.addPendingTransaction(receipt.hash, 'gor');
  }

  async function executeTransactions(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);

    const receipt = await network.actions.executeTransactions(auth.web3, proposal);
    console.log('Receipt', receipt);

    uiStore.addPendingTransaction(receipt.hash, 'gor');
  }

  const actions = {
    createSpace,
    updateMetadata,
    vote,
    propose,
    finalizeProposal,
    receiveProposal,
    executeTransactions
  };

  return Object.fromEntries(
    Object.entries(actions).map(([key, value]) => [key, wrapWithErrors(value)])
  );
}
