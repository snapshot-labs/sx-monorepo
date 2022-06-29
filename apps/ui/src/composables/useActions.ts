import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import clients from '@/helpers/clients';
import { pin } from '@snapshot-labs/pineapple';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import { useAccount } from '@/composables/useAccount';
import { useModal } from '@/composables/useModal';
import type { Transaction } from '@/types';

export function useActions() {
  const { web3 } = useWeb3();
  const { modalAccountOpen } = useModal();
  const auth = getInstance();
  const { pendingCount } = useTxStatus();
  const { loadVotes } = useAccount();

  async function forceLogin() {
    modalAccountOpen.value = true;
  }

  async function vote(space: string, proposal: number, choice: number) {
    if (!web3.value.account) return await forceLogin();
    const isStarkNet = web3.value.type === 'argentx';
    const account = isStarkNet ? auth.provider.value.account : auth.web3;
    const type = isStarkNet ? 'StarkNetSig' : 'EthereumSig';
    const envelop = await clients[type].vote(account, web3.value.account, {
      space,
      proposal,
      choice
    });
    console.log('Envelop', envelop);
    pendingCount.value++;
    const receipt = await clients[type].send(envelop);
    pendingCount.value--;
    console.log('Receipt', receipt);
    await loadVotes();
  }

  async function propose(
    space: string,
    executionHash: string,
    title: string,
    body: string,
    discussion: string,
    execution: Transaction[]
  ) {
    if (!web3.value.account) return await forceLogin();
    const pinned = await pin({ title, body, discussion, execution });
    if (!pinned || !pinned.cid) return;
    console.log('IPFS', pinned);
    const isStarkNet = web3.value.type === 'argentx';
    const account = isStarkNet ? auth.provider.value.account : auth.web3;
    const type = isStarkNet ? 'StarkNetSig' : 'EthereumSig';
    const envelop = await clients[type].propose(account, web3.value.account, {
      space,
      executionHash,
      metadataURI: `ipfs://${pinned.cid}`
    });
    console.log('Envelop', envelop);
    pendingCount.value++;
    const receipt = await clients[type].send(envelop);
    pendingCount.value--;
    console.log('Receipt', receipt);
  }

  return {
    vote,
    propose
  };
}
