import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { getNetwork, getReadWriteNetwork } from '@/networks';
import { registerTransaction } from '@/helpers/mana';
import { convertToMetaTransactions } from '@/helpers/transactions';
import type {
  Transaction,
  Proposal,
  SpaceMetadata,
  SpaceSettings,
  Space,
  Choice,
  NetworkID,
  VoteType
} from '@/types';
import type { Connector, StrategyConfig } from '@/networks/types';

export function useActions() {
  const { mixpanel } = useMixpanel();
  const uiStore = useUiStore();
  const { web3 } = useWeb3();
  const { getCurrentFromDuration } = useMetaStore();
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

  async function handleCommitEnvelope(envelope: any, networkId: NetworkID) {
    // TODO: it should work with WalletConnect, should be done before L1 transaction is broadcasted
    const network = getNetwork(networkId);

    if (envelope?.signatureData?.commitHash && network.baseNetworkId) {
      await registerTransaction(network.chainId, {
        type: envelope.signatureData.primaryType,
        hash: envelope.signatureData.commitHash,
        payload: envelope.data
      });

      if (envelope.signatureData.commitTxId) {
        uiStore.addPendingTransaction(envelope.signatureData.commitTxId, network.baseNetworkId);
      }

      uiStore.addNotification(
        'success',
        'Transaction set up. It will be processed once received on L2 network automatically.'
      );

      return true;
    }

    return false;
  }

  async function wrapPromise(networkId: NetworkID, promise: Promise<any>) {
    const network = getNetwork(networkId);

    const envelope = await promise;

    if (handleSafeEnvelope(envelope)) return;
    if (await handleCommitEnvelope(envelope, networkId)) return;

    // TODO: unify send/soc to both return txHash under same property
    if (envelope.payloadType === 'HIGHLIGHT_VOTE') {
      console.log('Receipt', envelope.signatureData);
    } else if (envelope.signatureData || envelope.sig) {
      const receipt = await network.actions.send(envelope);
      const hash = receipt.transaction_hash || receipt.hash;

      console.log('Receipt', receipt);

      hash && uiStore.addPendingTransaction(hash, networkId);
    } else {
      console.log('Receipt', envelope);

      uiStore.addPendingTransaction(envelope.transaction_hash || envelope.hash, networkId);
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

    const network = getReadWriteNetwork(networkId);
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

    const network = getReadWriteNetwork(networkId);
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

    const network = getReadWriteNetwork(networkId);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    const receipt = await network.actions.createSpace(auth.web3, salt, {
      controller,
      votingDelay: getCurrentFromDuration(networkId, settings.votingDelay),
      minVotingDuration: getCurrentFromDuration(networkId, settings.minVotingDuration),
      maxVotingDuration: getCurrentFromDuration(networkId, settings.maxVotingDuration),
      authenticators,
      validationStrategy,
      votingStrategies,
      executionStrategies,
      metadata
    });

    console.log('Receipt', receipt);

    mixpanel.track('Create space', {
      network: networkId,
      predictedSpaceAddress: predictSpaceAddress(networkId, salt)
    });

    return receipt;
  }

  async function updateMetadata(space: Space, metadata: SpaceMetadata) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(space.network, network.actions.setMetadata(auth.web3, space, metadata));
  }

  async function vote(proposal: Proposal, choice: Choice) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.vote(
        auth.web3,
        web3.value.type as Connector,
        web3.value.account,
        proposal,
        choice
      )
    );

    uiStore.addPendingVote(proposal.id);

    mixpanel.track('Vote', {
      network: proposal.network,
      space: proposal.space,
      proposalId: proposal.id,
      choice
    });
  }

  async function propose(
    space: Space,
    title: string,
    body: string,
    discussion: string,
    type: VoteType,
    choices: string[],
    executionStrategy: string | null,
    execution: Transaction[]
  ) {
    if (!web3.value.account) {
      forceLogin();
      return false;
    }

    const network = getNetwork(space.network);

    const transactions = execution.map((tx: Transaction) => ({
      ...tx,
      operation: 0
    }));

    const pinned = await network.helpers.pin({
      title,
      body,
      discussion,
      type,
      choices: choices.filter(c => !!c),
      execution: transactions
    });
    if (!pinned || !pinned.cid) return false;
    console.log('IPFS', pinned);

    await wrapPromise(
      space.network,
      network.actions.propose(
        auth.web3,
        web3.value.type as Connector,
        web3.value.account,
        space,
        pinned.cid,
        executionStrategy,
        convertToMetaTransactions(transactions)
      )
    );

    mixpanel.track('Propose', {
      network: space.network,
      space: space.id
    });

    return true;
  }

  async function updateProposal(
    space: Space,
    proposalId: number | string,
    title: string,
    body: string,
    discussion: string,
    type: VoteType,
    choices: string[],
    executionStrategy: string | null,
    execution: Transaction[]
  ) {
    if (!web3.value.account) {
      forceLogin();
      return false;
    }

    const network = getNetwork(space.network);

    const transactions = execution.map((tx: Transaction) => ({
      ...tx,
      operation: 0
    }));

    const pinned = await network.helpers.pin({
      title,
      body,
      discussion,
      type,
      choices: choices.filter(c => !!c),
      execution: transactions
    });
    if (!pinned || !pinned.cid) return false;
    console.log('IPFS', pinned);

    await wrapPromise(
      space.network,
      network.actions.updateProposal(
        auth.web3,
        web3.value.type as Connector,
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
    if (!web3.value.account) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(proposal.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(proposal.network, network.actions.cancelProposal(auth.web3, proposal));

    return true;
  }

  async function finalizeProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(proposal.network, network.actions.finalizeProposal(auth.web3, proposal));
  }

  async function executeTransactions(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(proposal.network, network.actions.executeTransactions(auth.web3, proposal));
  }

  async function executeQueuedProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(proposal.network, network.actions.executeQueuedProposal(auth.web3, proposal));
  }

  async function vetoProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(proposal.network, network.actions.vetoProposal(auth.web3, proposal));
  }

  async function setVotingDelay(space: Space, votingDelay: number) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(
      space.network,
      network.actions.setVotingDelay(
        auth.web3,
        space,
        getCurrentFromDuration(space.network, votingDelay)
      )
    );
  }

  async function setMinVotingDuration(space: Space, minVotingDuration: number) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(
      space.network,
      network.actions.setMinVotingDuration(
        auth.web3,
        space,
        getCurrentFromDuration(space.network, minVotingDuration)
      )
    );
  }

  async function setMaxVotingDuration(space: Space, maxVotingDuration: number) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(
      space.network,
      network.actions.setMaxVotingDuration(
        auth.web3,
        space,
        getCurrentFromDuration(space.network, maxVotingDuration)
      )
    );
  }

  async function transferOwnership(space: Space, owner: string) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(space.network, network.actions.transferOwnership(auth.web3, space, owner));
  }

  async function updateStrategies(
    space: Space,
    authenticatorsToAdd: StrategyConfig[],
    authenticatorsToRemove: number[],
    votingStrategiesToAdd: StrategyConfig[],
    votingStrategiesToRemove: number[],
    validationStrategy: StrategyConfig
  ) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    await wrapPromise(
      space.network,
      network.actions.updateStrategies(
        auth.web3,
        space,
        authenticatorsToAdd,
        authenticatorsToRemove,
        votingStrategiesToAdd,
        votingStrategiesToRemove,
        validationStrategy
      )
    );
  }

  async function delegate(
    space: Space,
    networkId: NetworkID,
    delegatee: string,
    delegationContract: string
  ) {
    if (!web3.value.account) return await forceLogin();

    const network = getReadWriteNetwork(networkId);

    await wrapPromise(
      networkId,
      network.actions.delegate(auth.web3, space, networkId, delegatee, delegationContract)
    );

    mixpanel.track('Delegate', {
      network: networkId,
      space: space.id,
      delegatee
    });
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
    executeTransactions: wrapWithErrors(executeTransactions),
    executeQueuedProposal: wrapWithErrors(executeQueuedProposal),
    vetoProposal: wrapWithErrors(vetoProposal),
    setVotingDelay: wrapWithErrors(setVotingDelay),
    setMinVotingDuration: wrapWithErrors(setMinVotingDuration),
    setMaxVotingDuration: wrapWithErrors(setMaxVotingDuration),
    transferOwnership: wrapWithErrors(transferOwnership),
    updateStrategies: wrapWithErrors(updateStrategies),
    delegate: wrapWithErrors(delegate)
  };
}
