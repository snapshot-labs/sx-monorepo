import { isHexString } from '@ethersproject/bytes';
import { Wallet } from '@ethersproject/wallet';
import { useQuery } from '@tanstack/vue-query';
import { fetchKeys } from '@/helpers/keycard';
import { ApiKey } from '@/helpers/keycard/types';
import pkg from '../../package.json';

export function useApiKeys() {
  const { web3Account: address, auth } = useWeb3();
  const { getAliasSigner } = useActions();
  const { modalAccountOpen } = useModal();

  const storedKeys = useStorage(
    `${pkg.name}.aliases`,
    {} as Record<string, string>
  );
  const isAuthenticating = ref(false);

  const aliasWallet = computed(() => {
    const pk = address.value && storedKeys.value[address.value];
    if (!pk || !isHexString(pk)) return null;

    try {
      return new Wallet(pk);
    } catch {
      return null;
    }
  });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['keycard', 'keys', address] as const,
    queryFn: () => fetchKeys(aliasWallet.value as Wallet, address.value),
    enabled: () => !!aliasWallet.value,
    retry: false
  });

  const authError = computed(() =>
    error.value?.cause === 401 ? error.value.message : ''
  );
  const isAuthenticated = computed(
    () => !!aliasWallet.value && !authError.value
  );
  const keys = computed<ApiKey[]>(() => data.value ?? []);
  const isLoading = computed(() => isAuthenticated.value && isPending.value);

  async function authenticate() {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    try {
      isAuthenticating.value = true;
      await getAliasSigner(auth.value);
      await refetch();
    } catch {
      return false;
    } finally {
      isAuthenticating.value = false;
    }

    return true;
  }

  return {
    isLoading,
    isError,
    reload: refetch,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    authError,
    keys
  };
}
