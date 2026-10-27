import { isHexString } from '@ethersproject/bytes';
import { Wallet } from '@ethersproject/wallet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import * as keycard from '@/helpers/keycard';
import pkg from '../../package.json';

export function useApiKeys() {
  const { web3Account: address, auth } = useWeb3();
  const { getAliasSigner } = useActions();
  const { modalAccountOpen } = useModal();
  const queryClient = useQueryClient();
  const uiStore = useUiStore();

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
    queryFn: () =>
      keycard.fetchKeys(aliasWallet.value as Wallet, address.value),
    enabled: () => !!aliasWallet.value,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  function useKeyMutation<T, R>(
    request: (alias: Wallet, from: string, params: T) => Promise<R>
  ) {
    return useMutation({
      mutationFn: (params: T) =>
        request(aliasWallet.value as Wallet, address.value, params),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: ['keycard', 'keys'] }),
      onError: (err: Error) => uiStore.addNotification('error', err.message)
    });
  }

  const { mutate: createKey, isPending: isCreating } = useKeyMutation(
    keycard.createKey
  );
  const { mutate: renameKey, isPending: isRenaming } = useKeyMutation(
    keycard.renameKey
  );
  const { mutate: deleteKey, isPending: isDeleting } = useKeyMutation(
    keycard.deleteKey
  );

  const isAuthError = computed(
    () => error.value?.cause === 400 || error.value?.cause === 401
  );
  const isAuthenticated = computed(
    () => !!aliasWallet.value && !isAuthError.value
  );
  const keys = computed(() => data.value?.keys ?? []);
  const dailyUsage = computed(() => data.value?.usage.daily ?? []);
  const monthlyUsage = computed(() => data.value?.usage.monthly ?? []);
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
    isAuthError,
    keys,
    createKey,
    isCreating,
    renameKey,
    isRenaming,
    deleteKey,
    isDeleting,
    dailyUsage,
    monthlyUsage
  };
}
