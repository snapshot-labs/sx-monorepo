import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { getNetwork, evmNetworks } from '@/networks';
import { useUiStore } from '@/stores/ui';

import { convertToMetaTransactions } from '@/helpers/transactions';
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

  function wrapWithErrors<T extends any[], U>(fn: (...args: T) => U) {
    return async (...args: T): Promise<U> => {
      try {
        return await fn(...args);
      } catch (e) {
        const isUserAbortError =
          e.code === 4001 ||
          e.message === 'User rejected the request.' ||
          e.code === 'ACTION_REJECTED';

        if (!isUserAbortError) {
          uiStore.addNotification('error', 'Something went wrong. Please try again later.');
        }

        throw e;
      }
    };
  }

  function handleSafeEnvelope(envelope: any) {
    if (envelope !== null) return false;

    uiStore.addNotification('success', 'Transaction set up.');
    return true;
  }

  async function wrapPromise(networkId: NetworkID, promise: Promise<any>) {
    const network = getNetwork(networkId);

    const envelope = await promise;

    if (handleSafeEnvelope(envelope)) return;

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

  async function predictSpaceAddress(networkId: NetworkID, salt: string): Promise<string | null> {
    if (!web3.value.account) {
      forceLogin();
      return null;
    }

    const network = getNetwork(networkId);
    return network.actions.predictSpaceAddress(auth.web3, { salt });
  }

  async function deployDependency(
    networkId: NetworkID,
    controller: string,
    spaceAddress: string,
    dependencyConfig: StrategyConfig
  ) {
    if (!web3.value.account) {
      forceLogin();
      return null;
    }

    const network = getNetwork(networkId);
    return network.actions.deployDependency(auth.web3, {
      controller,
      spaceAddress,
      strategy: dependencyConfig
    });
  }

  async function createSpace(
    networkId: NetworkID,
    salt: string,
    metadata: SpaceMetadata,
    settings: SpaceSettings,
    authenticators: StrategyConfig[],
    validationStrategy: StrategyConfig,
    votingStrategies: StrategyConfig[],
    executionStrategies: StrategyConfig[],
    controller: string
  ) {
    if (!web3.value.account) {
      forceLogin();
      return false;
    }

    const network = getNetwork(networkId);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    const receipt = await network.actions.createSpace(auth.web3, salt, {
      controller,
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

    return receipt.transaction_hash || receipt.hash;
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

    uiStore.addPendingVote(proposal.id);
  }

  async function propose(
    space: Space,
    title: string,
    body: string,
    discussion: string,
    executionStrategy: string | null,
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
      network.actions.propose(
        auth.web3,
        web3.value.account,
        space,
        pinned.cid,
        executionStrategy,
        convertToMetaTransactions(transactions)
      )
    );

    return true;
  }

  async function updateProposal(
    space: Space,
    proposalId: number,
    title: string,
    body: string,
    discussion: string,
    executionStrategy: string | null,
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
      network.actions.updateProposal(
        auth.web3,
        web3.value.account,
        space,
        proposalId,
        pinned.cid,
        executionStrategy,
        convertToMetaTransactions(transactions)
      )
    );

    return true;
  }

  async function cancelProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);
    const receipt = await network.actions.cancelProposal(auth.web3, proposal);
    console.log('Receipt', receipt);

    if (handleSafeEnvelope(receipt)) return;

    uiStore.addPendingTransaction(receipt.hash, proposal.network);
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

    const targetNetwork = proposal.network === 'sn-tn2' ? 'gor' : proposal.network;
    uiStore.addPendingTransaction(receipt.hash, targetNetwork);
  }

  async function executeQueuedProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);

    const receipt = await network.actions.executeQueuedProposal(auth.web3, proposal);
    console.log('Receipt', receipt);

    const targetNetwork = proposal.network === 'sn-tn2' ? 'gor' : proposal.network;
    uiStore.addPendingTransaction(receipt.hash, targetNetwork);
  }

  async function vetoProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);

    const receipt = await network.actions.vetoProposal(auth.web3, proposal);
    console.log('Receipt', receipt);

    const targetNetwork = proposal.network === 'sn-tn2' ? 'gor' : proposal.network;
    uiStore.addPendingTransaction(receipt.hash, targetNetwork);
  }

  async function setVotingDelay(space: Space, votingDelay: number) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(space.network);
    const receipt = await network.actions.setVotingDelay(auth.web3, space, votingDelay);
    console.log('Receipt', receipt);

    if (handleSafeEnvelope(receipt)) return;

    uiStore.addPendingTransaction(receipt.hash, space.network);
  }

  async function setMinVotingDuration(space: Space, minVotingDuration: number) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(space.network);
    const receipt = await network.actions.setMinVotingDuration(auth.web3, space, minVotingDuration);
    console.log('Receipt', receipt);

    if (handleSafeEnvelope(receipt)) return;

    uiStore.addPendingTransaction(receipt.hash, space.network);
  }

  async function setMaxVotingDuration(space: Space, maxVotingDuration: number) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(space.network);
    const receipt = await network.actions.setMaxVotingDuration(auth.web3, space, maxVotingDuration);
    console.log('Receipt', receipt);

    if (handleSafeEnvelope(receipt)) return;

    uiStore.addPendingTransaction(receipt.hash, space.network);
  }

  async function transferOwnership(space: Space, owner: string) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(space.network);
    const receipt = await network.actions.transferOwnership(auth.web3, space, owner);
    console.log('Receipt', receipt);

    if (handleSafeEnvelope(receipt)) return;

    uiStore.addPendingTransaction(receipt.hash, space.network);
  }

  return {
    predictSpaceAddress: wrapWithErrors(predictSpaceAddress),
    deployDependency: wrapWithErrors(deployDependency),
    createSpace: wrapWithErrors(createSpace),
    updateMetadata: wrapWithErrors(updateMetadata),
    vote: wrapWithErrors(vote),
    propose: wrapWithErrors(propose),
    updateProposal: wrapWithErrors(updateProposal),
    cancelProposal: wrapWithErrors(cancelProposal),
    finalizeProposal: wrapWithErrors(finalizeProposal),
    receiveProposal: wrapWithErrors(receiveProposal),
    executeTransactions: wrapWithErrors(executeTransactions),
    executeQueuedProposal: wrapWithErrors(executeQueuedProposal),
    vetoProposal: wrapWithErrors(vetoProposal),
    setVotingDelay: wrapWithErrors(setVotingDelay),
    setMinVotingDuration: wrapWithErrors(setMinVotingDuration),
    setMaxVotingDuration: wrapWithErrors(setMaxVotingDuration),
    transferOwnership: wrapWithErrors(transferOwnership)
  };
}
