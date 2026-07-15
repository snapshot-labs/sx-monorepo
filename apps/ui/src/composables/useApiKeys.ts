import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  accountBalance,
  accountSpend,
  fetchAccount,
  fetchUsage,
  createKey as sendCreateKey,
  revokeKey as sendRevokeKey,
  topUp as sendTopUp,
  STORAGE_PREFIX
} from '@/helpers/keycard';
import { Account, ApiKey } from '@/helpers/keycard/types';
import { sleep } from '@/helpers/utils';
import pkg from '../../package.json';

// A user is "verified" once they have an alias in this browser — the alias
// system lets them manage keys without signing each action. The demo flag
// simulates that one-time setup without touching the real alias storage.
export function useApiKeys() {
  const { web3Account: address } = useWeb3();
  const queryClient = useQueryClient();

  const aliases = useStorage(
    `${pkg.name}.aliases`,
    {} as Record<string, string>
  );
  const demoVerified = useStorage(
    `${STORAGE_PREFIX}.verified`,
    {} as Record<string, boolean>
  );
  const isVerifying = ref(false);

  const isVerified = computed(() => {
    if (!address.value) return false;
    return (
      !!aliases.value[address.value] ||
      !!demoVerified.value[address.value.toLowerCase()]
    );
  });

  const accountQueryKey = ['keycard', 'account', address] as const;

  const {
    data: account,
    isPending,
    isError,
    refetch: refetchAccount
  } = useQuery({
    queryKey: accountQueryKey,
    queryFn: () => fetchAccount(address.value),
    enabled: () => !!address.value
  });

  const { data: usageHistory, refetch: refetchUsage } = useQuery({
    queryKey: ['keycard', 'usage', address] as const,
    queryFn: () => fetchUsage(address.value),
    enabled: () => !!address.value
  });

  const isLoading = computed(() => !!address.value && isPending.value);
  const keys = computed<ApiKey[]>(() => account.value?.keys ?? []);
  const balance = computed(() =>
    account.value ? accountBalance(account.value) : 0
  );
  const spend = computed(() =>
    account.value ? accountSpend(account.value) : 0
  );
  const dailyUsage = computed(() => usageHistory.value?.daily ?? []);
  const monthlyUsage = computed(() => usageHistory.value?.monthly ?? []);

  function cacheAccount(next: Account) {
    queryClient.setQueryData(accountQueryKey, next);
  }

  const { mutateAsync: sendCreate } = useMutation({
    mutationFn: (name: string) => sendCreateKey(address.value, name),
    onSuccess: ({ account: next }) => cacheAccount(next)
  });
  const { mutateAsync: sendRevoke } = useMutation({
    mutationFn: (id: string) => sendRevokeKey(address.value, id),
    onSuccess: cacheAccount
  });
  const { mutateAsync: sendTop } = useMutation({
    mutationFn: (amount: number) => sendTopUp(address.value, amount),
    onSuccess: cacheAccount
  });

  async function createKey(name: string): Promise<string> {
    const { key } = await sendCreate(name);
    return key;
  }
  async function revokeKey(id: string): Promise<void> {
    await sendRevoke(id);
  }
  async function topUp(amount: number): Promise<void> {
    await sendTop(amount);
  }

  async function verify() {
    try {
      isVerifying.value = true;
      await sleep(1200);
      demoVerified.value = {
        ...demoVerified.value,
        [address.value.toLowerCase()]: true
      };
    } finally {
      isVerifying.value = false;
    }
  }

  function reload() {
    refetchAccount();
    refetchUsage();
  }

  return {
    isLoading,
    isError,
    reload,
    isVerified,
    isVerifying,
    verify,
    keys,
    balance,
    spend,
    dailyUsage,
    monthlyUsage,
    createKey,
    revokeKey,
    topUp
  };
}
