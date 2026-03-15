import { getAddress, isAddress } from '@ethersproject/address';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { isUserAbortError } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';

const ALIAS_AUTHORIZE_KEYS = {
  check: (
    account: Ref<string> | ComputedRef<string>,
    aliasAddress: Ref<string>
  ) => ['aliasAuthorize', 'check', account, aliasAddress] as const
};

export function useAliasAuthorize(aliasAddress: Ref<string>) {
  const { web3Account, auth } = useWeb3();
  const queryClient = useQueryClient();

  const isValidAddress = computed(() => isAddress(aliasAddress.value));
  const checksumAddress = computed(() =>
    isValidAddress.value ? getAddress(aliasAddress.value) : ''
  );
  const isSelfAlias = computed(
    () =>
      web3Account.value &&
      isValidAddress.value &&
      checksumAddress.value === getAddress(web3Account.value)
  );

  const { data: isAlreadyAuthorized, isPending: isCheckingAlias } = useQuery({
    queryKey: ALIAS_AUTHORIZE_KEYS.check(web3Account, aliasAddress),
    queryFn: async () => {
      const network = getNetwork(metadataNetwork);
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

      const network = getNetwork(metadataNetwork);
      const envelope = await network.actions.setAlias(
        auth.value.provider,
        checksumAddress.value
      );
      await network.actions.send(envelope);
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ALIAS_AUTHORIZE_KEYS.check(web3Account, aliasAddress),
        true
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
    error,
    isAlreadyAuthorized: computed(() => isAlreadyAuthorized.value ?? false),
    isCheckingAlias,
    isValidAddress,
    isSelfAlias,
    checksumAddress,
    authorize
  };
}
