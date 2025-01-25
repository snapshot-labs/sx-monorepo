import { Web3Provider } from '@ethersproject/providers';
import { registerTransaction } from '@/helpers/mana';
import { getNetwork, getReadWriteNetwork, metadataNetwork } from '@/networks';
import { STARKNET_CONNECTORS } from '@/networks/common/constants';
import { METADATA } from '@/networks/starknet';
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
  const { web3, connector, provider } = useWeb3();
  const { addPendingVote } = useAccount();
  const { getCurrentFromDuration } = useMetaStore();
  const { modalAccountOpen } = useModal();

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
          uiStore.addNotification(
            'error',
            'Something went wrong. Please try again later.'
          );
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

      uiStore.addNotification(
        'success',
        'Transaction set up. It will be processed once received on L2 network automatically.'
      );

      return true;
    }

    return false;
  }

  async function wrapPromise(
    networkId: NetworkID,
    promise: Promise<any>,
    opts: { transactionNetworkId?: NetworkID } = {}
  ): Promise<string | null> {
    const network = getNetwork(networkId);

    const envelope = await promise;

    if (handleSafeEnvelope(envelope)) return null;
    if (await handleCommitEnvelope(envelope, networkId)) return null;

    let hash;
    // TODO: unify send/soc to both return txHash under same property
    if (envelope.payloadType === 'HIGHLIGHT_VOTE') {
      console.log('Receipt', envelope.signatureData);
    } else if (envelope.signatureData || envelope.sig) {
      const receipt = await network.actions.send(envelope);
      hash = receipt.transaction_hash || receipt.hash;

      console.log('Receipt', receipt);

      if (envelope.signatureData.signature === '0x')
        uiStore.addNotification(
          'success',
          'Your vote is pending! waiting for other signers'
        );
      hash && uiStore.addPendingTransaction(hash, networkId);
    } else {
      hash = envelope.transaction_hash || envelope.hash;
      console.log('Receipt', envelope);

      uiStore.addPendingTransaction(
        hash,
        opts.transactionNetworkId || networkId
      );
    }

    return hash;
  }

  async function forceLogin() {
    modalAccountOpen.value = true;
  }

  async function getAliasSigner(connector: Connector, provider: Web3Provider) {
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
    if (!web3.value.account || !connector.value || !provider.value) {
      forceLogin();
      return null;
    }

    const network = getReadWriteNetwork(networkId);
    return network.actions.predictSpaceAddress(provider.value, { salt });
  }

  async function deployDependency(
    networkId: NetworkID,
    controller: string,
    spaceAddress: string,
    dependencyConfig: StrategyConfig
  ) {
    if (!web3.value.account || !connector.value || !provider.value) {
      forceLogin();
      return null;
    }

    const network = getReadWriteNetwork(networkId);
    return network.actions.deployDependency(
      provider.value,
      connector.value.type,
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
    if (!web3.value.account || !connector.value || !provider.value) {
      forceLogin();
      return false;
    }

    const network = getReadWriteNetwork(networkId);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    const receipt = await network.actions.createSpace(provider.value, salt, {
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
    });

    console.log('Receipt', receipt);

    return receipt;
  }

  async function vote(
    proposal: Proposal,
    choice: Choice,
    reason: string,
    app: string
  ): Promise<string | null> {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(proposal.network);

    const txHash = await wrapPromise(
      proposal.network,
      network.actions.vote(
        provider.value,
        connector.value.type,
        web3.value.account,
        proposal,
        choice,
        reason,
        app
      )
    );

    addPendingVote(proposal.id);

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
    if (!web3.value.account || !connector.value || !provider.value) {
      forceLogin();
      return false;
    }

    const network = getNetwork(space.network);

    await wrapPromise(
      space.network,
      network.actions.propose(
        provider.value,
        connector.value.type,
        web3.value.account,
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
      )
    );

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
    privacy: Privacy,
    labels: string[],
    executions: ExecutionInfo[] | null
  ) {
    if (!web3.value.account || !connector.value || !provider.value) {
      forceLogin();
      return false;
    }

    const network = getNetwork(space.network);

    await wrapPromise(
      space.network,
      network.actions.updateProposal(
        provider.value,
        connector.value.type,
        web3.value.account,
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
      )
    );

    return true;
  }

  async function flagProposal(proposal: Proposal) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(proposal.network);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    await wrapPromise(
      proposal.network,
      network.actions.flagProposal(provider.value, proposal)
    );

    return true;
  }

  async function cancelProposal(proposal: Proposal) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(proposal.network);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    await wrapPromise(
      proposal.network,
      network.actions.cancelProposal(provider.value, proposal)
    );

    return true;
  }

  async function finalizeProposal(proposal: Proposal) {
    if (!web3.value.account || !connector.value || !provider.value)
      return await forceLogin();
    if (connector.value.type === 'argentx')
      throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.finalizeProposal(provider.value, proposal)
    );
  }

  async function executeTransactions(proposal: Proposal) {
    if (!provider.value) return await forceLogin();

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.executeTransactions(provider.value, proposal)
    );
  }

  async function executeQueuedProposal(proposal: Proposal) {
    if (!provider.value) return await forceLogin();

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.executeQueuedProposal(provider.value, proposal),
      {
        transactionNetworkId: proposal.execution_network
      }
    );
  }

  async function vetoProposal(proposal: Proposal) {
    if (!web3.value.account || !connector.value || !provider.value)
      return await forceLogin();
    if (connector.value.type === 'argentx')
      throw new Error('ArgentX is not supported');

    const network = getReadWriteNetwork(proposal.network);

    await wrapPromise(
      proposal.network,
      network.actions.vetoProposal(provider.value, proposal)
    );
  }

  async function transferOwnership(space: Space, owner: string) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.transferOwnership(provider.value, space, owner)
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
    votingDelay: number | null,
    minVotingDuration: number | null,
    maxVotingDuration: number | null
  ) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return null;
    }

    const network = getReadWriteNetwork(space.network);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.updateSettings(
        provider.value,
        space,
        metadata,
        authenticatorsToAdd,
        authenticatorsToRemove,
        votingStrategiesToAdd,
        votingStrategiesToRemove,
        validationStrategy,
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
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.updateSettingsRaw(provider.value, space, settings)
    );
  }

  async function deleteSpace(space: Space) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return null;
    }

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(connector.value.type)) {
      throw new Error(
        `${connector.value.type} is not supported for this action`
      );
    }

    return wrapPromise(
      space.network,
      network.actions.deleteSpace(provider.value, space)
    );
  }

  async function delegate(
    space: Space,
    delegationType: DelegationType,
    delegatee: string,
    delegationContract: string,
    chainId: ChainId
  ) {
    if (!web3.value.account || !provider.value) return await forceLogin();

    const isEvmNetwork = typeof chainId === 'number';
    const actionNetwork = isEvmNetwork
      ? 'eth'
      : (Object.entries(METADATA).find(
          ([, metadata]) => metadata.chainId === chainId
        )?.[0] as NetworkID);
    if (!actionNetwork) throw new Error('Failed to detect action network');

    const network = getReadWriteNetwork(actionNetwork);

    await wrapPromise(
      actionNetwork,
      network.actions.delegate(
        provider.value,
        space,
        actionNetwork,
        delegationType,
        delegatee,
        delegationContract,
        chainId
      )
    );
  }

  async function followSpace(networkId: NetworkID, spaceId: string) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    try {
      await wrapPromise(
        metadataNetwork,
        network.actions.followSpace(
          await getAliasSigner(connector.value, provider.value),
          networkId,
          spaceId,
          web3.value.account
        )
      );
    } catch (e) {
      uiStore.addNotification('error', e.message);
      return false;
    }

    return true;
  }

  async function unfollowSpace(networkId: NetworkID, spaceId: string) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    try {
      await wrapPromise(
        metadataNetwork,
        network.actions.unfollowSpace(
          await getAliasSigner(connector.value, provider.value),
          networkId,
          spaceId,
          web3.value.account
        )
      );
    } catch (e) {
      uiStore.addNotification('error', e.message);
      return false;
    }

    return true;
  }

  async function updateUser(user: User) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    await wrapPromise(
      metadataNetwork,
      network.actions.updateUser(
        await getAliasSigner(connector.value, provider.value),
        user,
        web3.value.account
      )
    );

    return true;
  }

  async function updateStatement(statement: Statement) {
    if (!web3.value.account || !connector.value || !provider.value) {
      await forceLogin();
      return false;
    }

    const network = getNetwork(metadataNetwork);

    await wrapPromise(
      metadataNetwork,
      network.actions.updateStatement(
        await getAliasSigner(connector.value, provider.value),
        statement,
        web3.value.account
      )
    );

    return true;
  }

  return {
    predictSpaceAddress: wrapWithErrors(predictSpaceAddress),
    deployDependency: wrapWithErrors(deployDependency),
    createSpace: wrapWithErrors(createSpace),
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
    followSpace: wrapWithErrors(followSpace),
    unfollowSpace: wrapWithErrors(unfollowSpace),
    updateUser: wrapWithErrors(updateUser),
    updateStatement: wrapWithErrors(updateStatement)
  };
}
