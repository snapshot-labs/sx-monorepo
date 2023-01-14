import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { currentNetwork } from '@/networks';
import { pin } from '@snapshot-labs/pineapple';
import { useUiStore } from '@/stores/ui';
import { useWeb3 } from '@/composables/useWeb3';
import { useAccount } from '@/composables/useAccount';
import { useModal } from '@/composables/useModal';
import type { Transaction, Proposal, Space } from '@/types';

export function useActions() {
  const uiStore = useUiStore();
  const { web3 } = useWeb3();
  const { modalAccountOpen } = useModal();
  const auth = getInstance();
  const { loadVotes } = useAccount();

  async function forceLogin() {
    modalAccountOpen.value = true;
  }

  async function vote(proposal: Proposal, choice: number) {
    if (!web3.value.account) return await forceLogin();
    if (web3.value.type === 'argentx') throw new Error('ArgentX is not supported');

    const envelope = await currentNetwork.actions.vote(
      auth.web3,
      web3.value.account,
      proposal,
      choice
    );

    console.log('envelope', envelope);
    uiStore.broadcastingTransactionsCount++;

    const receipt = await currentNetwork.actions.send(envelope);

    console.log('Receipt', receipt);
    uiStore.broadcastingTransactionsCount--;
    uiStore.addPendingTransaction(receipt.transaction_hash);

    await loadVotes();
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

    const transactions = execution.map((tx: Transaction) => ({
      ...tx,
      nonce: 0,
      operation: 0
    }));

    const pinned = await pin({
      title,
      body,
      discussion,
      execution: transactions
    });
    if (!pinned || !pinned.cid) return;
    console.log('IPFS', pinned);

    const envelope = await currentNetwork.actions.propose(
      auth.web3,
      web3.value.account,
      space,
      pinned.cid,
      transactions
    );

    console.log('envelope', envelope);
    uiStore.broadcastingTransactionsCount++;

    const receipt = await currentNetwork.actions.send(envelope);

    console.log('Receipt', receipt);
    uiStore.broadcastingTransactionsCount--;
    uiStore.addPendingTransaction(receipt.transaction_hash);
  }

  return {
    vote,
    propose
  };
}
