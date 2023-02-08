import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { getNetwork } from '@/networks';
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

  async function wrapPromise(networkId: NetworkID, promise: Promise<any>) {
    const network = getNetwork(networkId);

    const envelope = await promise;
    console.log('envelope', envelope);

    // TODO: unify send/soc to both return txHash under same property
    if (network.hasRelayer) {
      const receipt = await network.actions.send(envelope);

      console.log('Receipt', receipt);
      uiStore.addPendingTransaction(receipt.transaction_hash, networkId);
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

    const pinned = await network.helpers.pin(metadata);

    const receipt = await network.actions.createSpace(auth.web3, {
      controller: web3.value.account,
      votingDelay: settings.votingDelay,
      minVotingDuration: settings.minVotingDuration,
      maxVotingDuration: settings.maxVotingDuration,
      proposalThreshold: BigInt(settings.proposalThreshold),
      qorum: BigInt(settings.quorum),
      authenticators: authenticators.map(config => config.address),
      votingStrategies: votingStrategies.map(config => config.address),
      votingStrategiesParams: votingStrategies.map(config =>
        config.generateParams ? config.generateParams(config.params) : []
      ),
      executionStrategies: executionStrategies.map(config => config.address),
      metadataUri: `ipfs://${pinned.cid}`
    });

    console.log('Receipt', receipt);
    uiStore.addPendingTransaction(
      network.hasRelayer ? receipt.transaction_hash : receipt.hash,
      networkId
    );
  }

  async function updateMetadata(space: Space, metadata: SpaceMetadata) {
    if (!web3.value.account) return await forceLogin();

    const network = getNetwork(space.network);
    if (!network.managerConnectors.includes(web3.value.type as Connector)) {
      throw new Error(`${web3.value.type} is not supported for this actions`);
    }

    const pinned = await network.helpers.pin(metadata);

    const receipt = await network.actions.setMetadataUri(
      auth.web3,
      space.id,
      `ipfs://${pinned.cid}`
    );

    console.log('Receipt', receipt);
    uiStore.addPendingTransaction(
      network.hasRelayer ? receipt.transaction_hash : receipt.hash,
      space.network
    );
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
    if (!web3.value.account) return await forceLogin();
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
    if (!pinned || !pinned.cid) return;
    console.log('IPFS', pinned);

    await wrapPromise(
      space.network,
      network.actions.propose(auth.web3, web3.value.account, space, pinned.cid, transactions)
    );
  }

  async function finalizeProposal(proposal: Proposal) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const network = getNetwork(proposal.network);

    const receipt = await network.actions.finalizeProposal(auth.web3, proposal);

    console.log('Receipt', receipt);
    uiStore.addPendingTransaction(
      network.hasRelayer ? receipt.transaction_hash : receipt.hash,
      proposal.network
    );
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

  return {
    createSpace,
    updateMetadata,
    vote,
    propose,
    finalizeProposal,
    receiveProposal,
    executeTransactions
  };
}
