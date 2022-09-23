import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import clients from '@/helpers/clients';
import { pin } from '@snapshot-labs/pineapple';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import { useAccount } from '@/composables/useAccount';
import { useModal } from '@/composables/useModal';
import type { Transaction, TransactionData } from '@/types';

// those are currently hardcoded
// 1. API doesn't return arrays properly (encodes them as string)
// 2. those are part of space, but we need to access it in Proposal page,
//    it's hard to do it without centralized store as we would need to refetch it
//    all the time in multiple screens
const ethSigAuthenticator =
  '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369';
const singleSlotProofStrategy = 0;
const vanillaExecutor =
  '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7';

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
    // TODO: StarknetSig is not updated
    const type = 'EthereumSig'; // isStarkNet ? 'StarkNetSig' : 'EthereumSig';

    const envelop = await clients[type].vote(account, web3.value.account, {
      space,
      authenticator: ethSigAuthenticator,
      strategies: [singleSlotProofStrategy],
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

    const executionData = execution.map(
      (tx: Transaction, i: number): TransactionData => ({
        ...tx,
        nonce: i,
        operation: '0'
      })
    );

    const pinned = await pin({
      title,
      body,
      discussion,
      execution: executionData
    });
    if (!pinned || !pinned.cid) return;
    console.log('IPFS', pinned);
    const isStarkNet = web3.value.type === 'argentx';
    const account = isStarkNet ? auth.provider.value.account : auth.web3;
    // TODO: StarknetSig is not updated
    const type = 'EthereumSig'; // isStarkNet ? 'StarkNetSig' : 'EthereumSig';

    const envelop = await clients[type].propose(account, web3.value.account, {
      space,
      authenticator: ethSigAuthenticator,
      strategies: [singleSlotProofStrategy],
      executor: vanillaExecutor,
      metadataUri: `ipfs://${pinned.cid}`,
      executionParams: []
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
