import { isUserAbortError } from '@/helpers/utils';
import { addressValidator } from '@/helpers/validation';
import { getNetwork, metadataNetwork } from '@/networks';

export function useAliasAuthorize(aliasAddress: Ref<string>) {
  const { web3Account, auth } = useWeb3();

  const isAuthorizing = ref(false);
  const error = ref<string | null>(null);
  const isAlreadyAuthorized = ref(false);
  const isCheckingAlias = ref(!!web3Account.value);
  const isValidAddress = computed(() => addressValidator(aliasAddress.value));

  async function checkExistingAlias() {
    if (!web3Account.value || !aliasAddress.value || !isValidAddress.value)
      return;

    isCheckingAlias.value = true;
    try {
      const network = getNetwork(metadataNetwork);
      const existing = await network.api.loadAlias(
        web3Account.value,
        aliasAddress.value,
        0
      );
      isAlreadyAuthorized.value = !!existing;
    } catch {
      isAlreadyAuthorized.value = false;
    } finally {
      isCheckingAlias.value = false;
    }
  }

  async function authorize() {
    if (!auth.value || !isValidAddress.value) return;

    isAuthorizing.value = true;
    error.value = null;

    try {
      const network = getNetwork(metadataNetwork);
      const envelope = await network.actions.setAlias(
        auth.value.provider,
        aliasAddress.value
      );
      await network.actions.send(envelope);
      isAlreadyAuthorized.value = true;
    } catch (err: any) {
      if (!isUserAbortError(err)) {
        error.value = err.message || 'Authorization failed';
      }
      isAuthorizing.value = false;
    }
  }

  watch(
    web3Account,
    () => {
      isAlreadyAuthorized.value = false;
      error.value = null;
      checkExistingAlias();
    },
    { immediate: true }
  );

  return {
    isAuthorizing,
    error,
    isAlreadyAuthorized,
    isCheckingAlias,
    isValidAddress,
    authorize
  };
}
