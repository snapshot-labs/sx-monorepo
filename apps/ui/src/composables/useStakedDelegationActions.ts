import { useQueryClient } from '@tanstack/vue-query';
import { Call } from 'starknet';
import {
  getStakedDelegationConfig,
  registryCalls,
  sendRegistryCall,
  waitForRegistryTransaction
} from '@/helpers/stakedVoteDelegation';
import { getUserFacingErrorMessage, isUserAbortError } from '@/helpers/utils';
import { STARKNET_CONNECTORS } from '@/networks/common/constants';
import { stakedDelegationKeys } from '@/queries/stakedVoteDelegation';

export type StakedDelegationAction =
  | 'delegate'
  | 'keep-own'
  | 'reset'
  | 'vote-receiver'
  | 'reset-vote-receiver'
  | 'accepts';

const pendingAction = ref<StakedDelegationAction | null>(null);

export function useStakedDelegationActions() {
  const { auth, web3 } = useWeb3();
  const { modalAccountOpen } = useModal();
  const uiStore = useUiStore();
  const queryClient = useQueryClient();

  // Guest sessions can hold an EVM address, so also check the address format
  // (Starknet addresses are formatted to 66 characters).
  const isStarknetWallet = computed(
    () =>
      !!auth.value &&
      STARKNET_CONNECTORS.includes(auth.value.connector.type) &&
      web3.value.account.length === 66
  );
  const isReadOnly = computed(() => auth.value?.connector.type === 'guest');

  async function run(action: StakedDelegationAction, call: Call) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    pendingAction.value = action;
    try {
      const txHash = await sendRegistryCall(auth.value.provider, call);
      uiStore.addPendingTransaction(
        txHash,
        getStakedDelegationConfig().chainId
      );
      await waitForRegistryTransaction(txHash);
      await queryClient.invalidateQueries({
        queryKey: stakedDelegationKeys.all
      });
      uiStore.addNotification('success', 'Saved on-chain.');
      return true;
    } catch (err) {
      if (!isUserAbortError(err)) {
        console.error(err);
        uiStore.addNotification('error', getUserFacingErrorMessage(err));
      }
      return false;
    } finally {
      pendingAction.value = null;
    }
  }

  return {
    pendingAction,
    isStarknetWallet,
    isReadOnly,
    delegate: (delegatee: string) =>
      run('delegate', registryCalls.delegate(delegatee)),
    keepOwnVote: () =>
      run('keep-own', registryCalls.delegate(web3.value.account)),
    resetDelegation: () => run('reset', registryCalls.resetDelegation()),
    setVoteReceiver: (receiver: string) =>
      run('vote-receiver', registryCalls.setVoteReceiver(receiver)),
    resetVoteReceiver: () =>
      run('reset-vote-receiver', registryCalls.setVoteReceiver('0x0')),
    setAcceptsDefaultDelegations: (accepts: boolean) =>
      run('accepts', registryCalls.setAcceptsDefaultDelegations(accepts))
  };
}
