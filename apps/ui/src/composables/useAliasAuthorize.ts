import { getAddress, isAddress } from '@ethersproject/address';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { isUserAbortError } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';
import { useUiStore } from '@/stores/ui';

const ALIAS_AUTHORIZE_KEYS = {
  check: (
    account: Ref<string> | ComputedRef<string>,
    aliasAddress: MaybeRefOrGetter<string>
  ) => ['aliasAuthorize', 'check', account, aliasAddress] as const
};

export function useAliasAuthorize(aliasAddress: MaybeRefOrGetter<string>) {
  const { web3Account, auth } = useWeb3();
  const queryClient = useQueryClient();
  const uiStore = useUiStore();

  const network = getNetwork(metadataNetwork);
  const isJustAuthorized = ref(false);

  const isValidAddress = computed(() => isAddress(toValue(aliasAddress)));
  const checksumAddress = computed(() =>
    isValidAddress.value ? getAddress(toValue(aliasAddress)) : ''
  );
  const isSelfAlias = computed(() =>
    Boolean(
      web3Account.value &&
        isValidAddress.value &&
        checksumAddress.value === getAddress(web3Account.value)
    )
  );

  const { data: isAlreadyAuthorized, isPending: isCheckingAlias } = useQuery({
    queryKey: ALIAS_AUTHORIZE_KEYS.check(web3Account, aliasAddress),
    queryFn: async () => {
      try {
        const existing = await network.api.loadAlias(
          toValue(web3Account),
          toValue(checksumAddress),
          0
        );
        return !!existing;
      } catch {
        return false;
      }
    },
    enabled: () =>
      !!toValue(web3Account) && !!toValue(aliasAddress) && isValidAddress.value
  });

  const {
    mutate: authorize,
    isPending: isAuthorizing,
    error: mutationError
  } = useMutation({
    mutationFn: async () => {
      if (!auth.value || !isValidAddress.value || isSelfAlias.value) return;

      const envelope = await network.actions.setAlias(
        auth.value.provider,
        checksumAddress.value
      );
      await network.actions.send(envelope);
    },
    onSuccess: () => {
      isJustAuthorized.value = true;
      queryClient.setQueryData(
        ALIAS_AUTHORIZE_KEYS.check(web3Account, aliasAddress),
        true
      );
    }
  });

  const { mutate: revoke, isPending: isRevoking } = useMutation({
    mutationFn: async () => {
      if (!auth.value || !isValidAddress.value) return;

      const envelope = await network.actions.revokeAlias(
        auth.value.provider,
        checksumAddress.value
      );
      await network.actions.send(envelope);
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ALIAS_AUTHORIZE_KEYS.check(web3Account, aliasAddress),
        false
      );
      uiStore.addNotification('success', 'Alias revoked.');
    },
    onError: (err: any) => {
      if (isUserAbortError(err)) return;
      uiStore.addNotification(
        'error',
        err?.message || 'Failed to revoke alias.'
      );
    }
  });

  const error = computed(() => {
    if (!mutationError.value || isUserAbortError(mutationError.value))
      return null;
    return (mutationError.value as Error).message || 'Authorization failed';
  });

  return {
    isAuthorizing,
    isJustAuthorized,
    isRevoking,
    error,
    isAlreadyAuthorized: computed(() => isAlreadyAuthorized.value ?? false),
    isCheckingAlias,
    isValidAddress,
    isSelfAlias,
    checksumAddress,
    authorize,
    revoke
  };
}
