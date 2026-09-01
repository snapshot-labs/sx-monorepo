import { Wallet } from '@ethersproject/wallet';
import { useQuery } from '@tanstack/vue-query';
import { fetchKeys } from '@/helpers/keycard';
import { ApiKey } from '@/helpers/keycard/types';

export function useApiKeys() {
  const { web3Account: address } = useWeb3();
  const {
    wallet: aliasWallet,
    isAuthenticating,
    authenticate: createAlias
  } = useAliasWallet();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['keycard', 'keys', address] as const,
    queryFn: () => fetchKeys(aliasWallet.value as Wallet, address.value),
    enabled: () => !!aliasWallet.value,
    retry: false
  });

  const isAuthError = computed(
    () => error.value?.cause === 400 || error.value?.cause === 401
  );
  const isAuthenticated = computed(
    () => !!aliasWallet.value && !isAuthError.value
  );
  const keys = computed<ApiKey[]>(() => data.value ?? []);
  const isLoading = computed(() => isAuthenticated.value && isPending.value);

  async function authenticate() {
    if (!(await createAlias())) return false;

    await refetch();

    return true;
  }

  return {
    isLoading,
    isError,
    reload: refetch,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    isAuthError,
    keys
  };
}
