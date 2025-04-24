import { Web3Provider } from '@ethersproject/providers';
import { getDelegationNetwork } from '@/helpers/delegation';
import { registerTransaction } from '@/helpers/mana';
import { isUserAbortError } from '@/helpers/utils';
import { getNetwork, getReadWriteNetwork, metadataNetwork } from '@/networks';
import { STARKNET_CONNECTORS } from '@/networks/common/constants';
import { Connector, ExecutionInfo, StrategyConfig } from '@/networks/types';
import {
  ChainId,
  Choice,
  DelegationType,
  NetworkID,
  Privacy,
  Proposal,
  Space,
  SpaceMetadata,
  SpaceMetadataDelegation,
  SpaceSettings,
  Statement,
  User,
  VoteType
} from '@/types';

const offchainToStarknetIds: Record<string, NetworkID> = {
  s: 'sn',
  's-tn': 'sn-sep'
};

const starknetNetworkId = offchainToStarknetIds[metadataNetwork];

export function useActions() {
  const uiStore = useUiStore();
  const alias = useAlias();
  const { auth } = useWeb3();
  const { addPendingVote } = useAccount();
  const { getCurrentFromDuration } = useMetaStore();
  const { modalAccountOpen } = useModal();

  function wrapWithErrors<T extends any[], U>(fn: (...args: T) => U) {
    return async (...args: T): Promise<U> => {
      try {
        return await fn(...args);
      } catch (e) {
        if (!isUserAbortError(e)) {
          console.error(e);
          uiStore.addNotification(
            'error',
            'Something went wrong. Please try again later.'
          );
        }

        throw e;
      }
    };
  }

  function handleSafeEnvelope(
    envelope: any,
    safeAppContext: 'vote' | 'propose' | 'transaction'
  ) {
    if (envelope !== null) return false;

    uiStore.openSafeModal({
      type: safeAppContext,
      showVerifierLink: false
    });

    return true;
  }

  async function handleCommitEnvelope(
    envelope: any,
    networkId: NetworkID,
    safeAppContext: 'vote' | 'propose' | 'transaction'
  ) {
    // TODO: it should work with WalletConnect, should be done before L1 transaction is broadcasted
    const network = getNetwork(networkId);

    if (envelope?.signatureData?.commitHash && network.baseNetworkId) {
      await registerTransaction(network.chainId, {
        type: envelope.signatureData.primaryType,
        sender: envelope.signatureData.address,
        hash: envelope.signatureData.commitHash,
        payload: envelope.data
      });

      if (envelope.signatureData.commitTxId) {
        uiStore.addPendingTransaction(
          envelope.signatureData.commitTxId,
          network.baseNetworkId
        );
      }

      if (envelope.signatureData.commitTxId) {
        uiStore.addNotification(
          'success',
          'Transaction set up. It will be processed once received on L2 network automatically.'
        );
      } else {
        uiStore.openSafeModal({
          type: safeAppContext,
          showVerifierLink: true
        });
      }

      return true;
    }

    return false;
  }

  async function wrapPromise(
    networkId: NetworkID,
    promise: Promise<any>,
    opts: {
      chainId?: ChainId;
      safeAppContext?: 'vote' | 'propose' | 'transaction';
    } = {}
  ): Promise<string | null> {
    const network = getNetwork(networkId);

    const envelope = await promise;

    if (handleSafeEnvelope(envelope, opts.safeAppContext ?? 'transaction')) {
      return null;
    }
    if (
      await handleCommitEnvelope(
        envelope,
        networkId,
        opts.safeAppContext ?? 'transaction'
      )
    ) {
      return null;
    }

    let hash;
    // TODO: unify send/soc to both return txHash under same property
    if (envelope.payloadType === 'HIGHLIGHT_VOTE') {
      console.log('Receipt', envelope.signatureData);
    } else if (envelope.type === 'HIGHLIGHT_ENVELOPE') {
      const receipt = await network.actions.send(envelope);

      console.log('receipt', receipt);
    } else if (envelope.signatureData || envelope.sig) {
      const receipt = await network.actions.send(envelope);
      hash = receipt.transaction_hash || receipt.hash;

      console.log('Receipt', receipt);

      if (envelope.signatureData.signature === '0x')
        uiStore.addNotification(
          'success',
          'Your vote is pending! waiting for other signers'
        );

      if (hash) {
        uiStore.addPendingTransaction(hash, network.chainId);
      }
    } else {
      hash = envelope.transaction_hash || envelope.hash;
      console.log('Receipt', envelope);

      uiStore.addPendingTransaction(hash, opts.chainId || network.chainId);
    }

    return hash;
  }

  async function forceLogin() {
    modalAccountOpen.value = true;
  }

  async function getAliasSigner({
    connector,
    provider
  }: {
    connector: Connector;
    provider: Web3Provider;
  }) {
    const network = getNetwork(
      STARKNET_CONNECTORS.includes(connector.type)
        ? starknetNetworkId
        : metadataNetwork
    );

    return alias.getAliasWallet(address =>
      wrapPromise(metadataNetwork, network.actions.setAlias(provider, address))
    );
  }

  async function predictSpaceAddress(
    networkId: NetworkID,
    salt: string
  ): Promise<string | null> {
    if (!auth.value) {
      forceLogin();
      return null;
    }

    const network = getReadWriteNetwork(networkId);
    return network.actions.predictSpaceAddress(auth.value.provider, { salt });
  }

  async function deployDependency(
    networkId: NetworkID,
    controller: string,
    spaceAddress: string,
    dependencyConfig: StrategyConfig
  ) {
    if (!auth.value) {
      forceLogin();
      return null;
    }

    const network = getReadWriteNetwork(networkId);
    return network.actions.deployDependency(
      auth.value.provider,
      auth.value.connector.type,
      {
        controller,
        spaceAddress,
        strategy: dependencyConfig
      }
    );
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
    executionDestinations: string[],
    controller: string
  ) {
    if (!auth.value) {
      forceLogin();
      return false;
    }

    const network = getReadWriteNetwork(networkId);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    const receipt = await network.actions.createSpace(
      auth.value.provider,
      salt,
      {
        controller,
        votingDelay: getCurrentFromDuration(networkId, settings.votingDelay),
        minVotingDuration: getCurrentFromDuration(
          networkId,
          settings.minVotingDuration
        ),
        maxVotingDuration: getCurrentFromDuration(
          networkId,
          settings.maxVotingDuration
        ),
        authenticators,
        validationStrategy,
        votingStrategies,
        executionStrategies,
        executionDestinations,
        metadata
      }
    );

    console.log('Receipt', receipt);

    return receipt;
  }

  async function createSpaceRaw(
    networkId: NetworkID,
    id: string,
    settings: string
  ) {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(networkId);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    return wrapPromise(
      networkId,
      network.actions.createSpaceRaw(auth.value.provider, id, settings)
    );
  }

  async function vote(
    proposal: Proposal,
    choice: Choice,
    reason: string,
    app: string
  ): Promise<string | null> {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(proposal.network);

    const txHash = await wrapPromise(
      proposal.network,
      network.actions.vote(
        auth.value.provider,
        auth.value.connector.type,
        auth.value.account,
        proposal,
        choice,
        reason,
        app
      ),
      {
        safeAppContext: 'vote'
      }
    );

    if (txHash) addPendingVote(proposal.id);

    return txHash;
  }

  async function propose(
    space: Space,
    title: string,
    body: string,
    discussion: string,
    type: VoteType,
    choices: string[],
    privacy: Privacy,
    labels: string[],
    app: string,
    created: number,
    start: number,
    min_end: number,
    max_end: number,
    executions: ExecutionInfo[] | null
  ) {
    if (!auth.value) {
      forceLogin();
      return false;
    }

    const network = getNetwork(space.network);

    const txHash = await wrapPromise(
      space.network,
      network.actions.propose(
        auth.value.provider,
        auth.value.connector.type,
        auth.value.account,
        space,
        title,
        body,
        discussion,
        type,
        choices,
        privacy,
        labels,
        app,
        created,
        start,
        min_end,
        max_end,
        executions
      ),
      {
        safeAppContext: 'propose'
      }
    );

    return txHash;
  }

  async function updateProposal(
    space: Space,
    proposalId: number | string,
    title: string,
    body: string,
    discussion: string,
    type: VoteType,
    choices: string[],
    privacy: Privacy,
    labels: string[],
    executions: ExecutionInfo[] | null
  ) {
    if (!auth.value) {
      forceLogin();
      return false;
    }

    const network = getNetwork(space.network);

    await wrapPromise(
      space.network,
      network.actions.updateProposal(
        auth.value.provider,
        auth.value.connector.type,
        auth.value.account,
        space,
        proposalId,
        title,
        body,
        discussion,
        type,
        choices,
        privacy,
        labels,
        executions
      ),
      {
        safeAppContext: 'propose'
      }
    );

    return true;
  }

  async function flagProposal(proposal: Proposal) {
    if (!auth.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(proposal.network);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    await wrapPromise(
      proposal.network,
      network.actions.flagProposal(auth.value.provider, proposal)
    );

    return true;
  }

  async function cancelProposal(proposal: Proposal) {
    if (!auth.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(proposal.network);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    await wrapPromise(
      proposal.network,
      network.actions.cancelProposal(
        auth.value.provider,
        auth.value.connector.type,
        proposal
      )
    );

    return true;
  }

  async function finalizeProposal(proposal: Proposal) {
    if (!auth.value) return await forceLogin();

    if (auth.value.connector.type === 'argentx')
      throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.finalizeProposal(auth.value.provider, proposal)
    );
  }

  async function executeTransactions(proposal: Proposal) {
    if (!auth.value) return await forceLogin();

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.executeTransactions(auth.value.provider, proposal)
    );
  }

  async function executeQueuedProposal(proposal: Proposal) {
    if (!auth.value) return await forceLogin();

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.executeQueuedProposal(auth.value.provider, proposal),
      {
        chainId: getNetwork(proposal.execution_network).chainId
      }
    );
  }

  async function vetoProposal(proposal: Proposal) {
    if (!auth.value) return await forceLogin();

    if (auth.value.connector.type === 'argentx')
      throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.vetoProposal(auth.value.provider, proposal)
    );
  }

  async function transferOwnership(space: Space, owner: string) {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.transferOwnership(
        auth.value.provider,
        auth.value.connector.type,
        space,
        owner
      )
    );
  }

  async function updateSettings(
    space: Space,
    metadata: SpaceMetadata,
    authenticatorsToAdd: StrategyConfig[],
    authenticatorsToRemove: number[],
    votingStrategiesToAdd: StrategyConfig[],
    votingStrategiesToRemove: number[],
    validationStrategy: StrategyConfig,
    executionStrategies: StrategyConfig[],
    votingDelay: number | null,
    minVotingDuration: number | null,
    maxVotingDuration: number | null
  ) {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.updateSettings(
        auth.value.provider,
        auth.value.connector.type,
        space,
        metadata,
        authenticatorsToAdd,
        authenticatorsToRemove,
        votingStrategiesToAdd,
        votingStrategiesToRemove,
        validationStrategy,
        executionStrategies,
        votingDelay !== null
          ? getCurrentFromDuration(space.network, votingDelay)
          : null,
        minVotingDuration !== null
          ? getCurrentFromDuration(space.network, minVotingDuration)
          : null,
        maxVotingDuration !== null
          ? getCurrentFromDuration(space.network, maxVotingDuration)
          : null
      )
    );
  }

  async function updateSettingsRaw(space: Space, settings: string) {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.updateSettingsRaw(auth.value.provider, space, settings)
    );
  }

  async function deleteSpace(space: Space) {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(auth.value.connector.type)) {
      throw new Error(
        `${auth.value.connector.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.deleteSpace(auth.value.provider, space)
    );
  }

  async function delegate(
    space: Space,
    delegationType: DelegationType,
    delegatee: string | null,
    delegationContract: string,
    chainId: ChainId
  ) {
    if (!auth.value) {
      await forceLogin();
      return null;
    }

    const actionNetwork = getDelegationNetwork(chainId);
    const network = getReadWriteNetwork(actionNetwork);

    return wrapPromise(
      actionNetwork,
      network.actions.delegate(
        auth.value.provider,
        space,
        actionNetwork,
        delegationType,
        delegatee,
        delegationContract,
        chainId
      ),
      { chainId }
    );
  }

  async function getDelegatee(
    delegation: SpaceMetadataDelegation,
    delegator: string
  ) {
    if (!auth.value) return;

    if (!delegation.chainId) throw new Error('Chain ID is missing');

    const actionNetwork = getDelegationNetwork(delegation.chainId);
    const network = getReadWriteNetwork(actionNetwork);

    return network.actions.getDelegatee(delegation, delegator);
  }

  async function followSpace(networkId: NetworkID, spaceId: string) {
    if (!auth.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    try {
      await wrapPromise(
        metadataNetwork,
        network.actions.followSpace(
          await getAliasSigner(auth.value),
          networkId,
          spaceId,
          auth.value.account
        )
      );
    } catch (e) {
      if (!isUserAbortError(e)) uiStore.addNotification('error', e.message);
      return false;
    }

    return true;
  }

  async function unfollowSpace(networkId: NetworkID, spaceId: string) {
    if (!auth.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    try {
      await wrapPromise(
        metadataNetwork,
        network.actions.unfollowSpace(
          await getAliasSigner(auth.value),
          networkId,
          spaceId,
          auth.value.account
        )
      );
    } catch (e) {
      if (!isUserAbortError(e)) uiStore.addNotification('error', e.message);
      return false;
    }

    return true;
  }

  async function updateUser(user: User) {
    if (!auth.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    await wrapPromise(
      metadataNetwork,
      network.actions.updateUser(
        await getAliasSigner(auth.value),
        user,
        auth.value.account
      )
    );

    return true;
  }

  async function updateStatement(statement: Statement) {
    if (!auth.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    await wrapPromise(
      metadataNetwork,
      network.actions.updateStatement(
        await getAliasSigner(auth.value),
        statement,
        auth.value.account
      )
    );

    return true;
  }

  return {
    predictSpaceAddress: wrapWithErrors(predictSpaceAddress),
    deployDependency: wrapWithErrors(deployDependency),
    createSpace: wrapWithErrors(createSpace),
    createSpaceRaw: wrapWithErrors(createSpaceRaw),
    vote: wrapWithErrors(vote),
    propose: wrapWithErrors(propose),
    updateProposal: wrapWithErrors(updateProposal),
    flagProposal: wrapWithErrors(flagProposal),
    cancelProposal: wrapWithErrors(cancelProposal),
    finalizeProposal: wrapWithErrors(finalizeProposal),
    executeTransactions: wrapWithErrors(executeTransactions),
    executeQueuedProposal: wrapWithErrors(executeQueuedProposal),
    vetoProposal: wrapWithErrors(vetoProposal),
    transferOwnership: wrapWithErrors(transferOwnership),
    updateSettings: wrapWithErrors(updateSettings),
    updateSettingsRaw: wrapWithErrors(updateSettingsRaw),
    deleteSpace: wrapWithErrors(deleteSpace),
    delegate: wrapWithErrors(delegate),
    getDelegatee: wrapWithErrors(getDelegatee),
    followSpace: wrapWithErrors(followSpace),
    unfollowSpace: wrapWithErrors(unfollowSpace),
    updateUser: wrapWithErrors(updateUser),
    updateStatement: wrapWithErrors(updateStatement)
  };
}
