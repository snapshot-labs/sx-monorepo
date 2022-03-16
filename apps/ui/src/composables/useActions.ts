import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { useWeb3 } from '@/composables/useWeb3';
import client from '@/helpers/client';
import { useTxStatus } from '@/composables/useTxStatus';

export function useActions() {
  const { web3 } = useWeb3();
  const auth = getInstance();
  const { pendingCount } = useTxStatus();

  async function vote(space: string, proposal: number, choice: number) {
    const envelop = await client.vote(auth.web3, web3.value.account, {
      space,
      proposal,
      choice
    });
    console.log('Envelop', envelop);
    pendingCount.value++;
    const receipt = await client.send(envelop);
    pendingCount.value--;
    console.log('Receipt', receipt);
  }

  async function propose(
    space: string,
    executionHash: string,
    metadataURI: string
  ) {
    const envelop = await client.propose(auth.web3, web3.value.account, {
      space,
      executionHash,
      metadataURI
    });
    console.log('Envelop', envelop);
    pendingCount.value++;
    const receipt = await client.send(envelop);
    pendingCount.value--;
    console.log('Receipt', receipt);
  }

  return {
    vote,
    propose
  };
}
