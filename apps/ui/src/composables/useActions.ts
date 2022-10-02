import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import clients from '@/helpers/clients';
import { pin } from '@snapshot-labs/pineapple';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import { useAccount } from '@/composables/useAccount';
import { useModal } from '@/composables/useModal';
import {
  SUPPORTED_AUTHENTICATORS,
  SUPPORTED_STRATEGIES
} from '@/helpers/constants';
import type { Transaction, TransactionData, Proposal, Space } from '@/types';

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

  function pickAuthenticatorAndStrategies(
    entity: Proposal | Space,
    authenticators: string[]
  ) {
    const authenticator = authenticators.find(
      authenticator => SUPPORTED_AUTHENTICATORS[authenticator]
    );

    const strategies = entity.strategies
      .map((strategy, index) => [index, strategy] as const)
      .filter(([, strategy]) => SUPPORTED_STRATEGIES[strategy])
      .map(([index]) => index);

    if (!authenticator || strategies.length === 0) {
      throw new Error('Unsupported space');
    }

    return { authenticator, strategies };
  }

  async function vote(proposal: Proposal, choice: number) {
    if (!web3.value.account) return await forceLogin();
    const isStarkNet = web3.value.type === 'argentx';
    const account = isStarkNet ? auth.provider.value.account : auth.web3;
    // TODO: StarknetSig is not updated
    const type = 'EthereumSig'; // isStarkNet ? 'StarkNetSig' : 'EthereumSig';

    const { authenticator, strategies } = pickAuthenticatorAndStrategies(
      proposal,
      proposal.space.authenticators
    );

    const envelop = await clients[type].vote(account, web3.value.account, {
      space: proposal.space.id,
      authenticator,
      strategies,
      proposal: proposal.proposal_id,
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
    space: Space,
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

    const { authenticator, strategies } = pickAuthenticatorAndStrategies(
      space,
      space.authenticators
    );

    const envelop = await clients[type].propose(account, web3.value.account, {
      space: space.id,
      authenticator,
      strategies,
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
