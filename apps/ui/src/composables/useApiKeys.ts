import {
  accountBalance,
  accountSpend,
  accountUsage,
  fetchAccount,
  createKey as sendCreateKey,
  revokeKey as sendRevokeKey,
  topUp as sendTopUp
} from '@/helpers/keycard';
import { Account, ApiKey } from '@/helpers/keycard/types';
import { sleep } from '@/helpers/utils';
import pkg from '../../package.json';

// A user is "verified" once they have an alias in this browser — the alias
// system lets them manage keys without signing each action. The demo flag
// simulates that one-time setup without touching the real alias storage.
export function useApiKeys() {
  const { web3 } = useWeb3();
  const aliases = useStorage(
    `${pkg.name}.aliases`,
    {} as Record<string, string>
  );
  const demoVerified = useStorage(
    'keycard.demo.verified',
    {} as Record<string, boolean>
  );

  const account = ref<Account | null>(null);
  const isLoading = ref(true);
  const isError = ref(false);
  const isVerifying = ref(false);

  const address = computed(() => web3.value.account);
  const isVerified = computed(() => {
    if (!address.value) return false;
    return (
      !!aliases.value[address.value] ||
      !!demoVerified.value[address.value.toLowerCase()]
    );
  });
  const keys = computed<ApiKey[]>(() => account.value?.keys ?? []);
  const balance = computed(() =>
    account.value ? accountBalance(account.value) : 0
  );
  const usage = computed(() =>
    account.value ? accountUsage(account.value) : { hub: 0, score: 0 }
  );
  const spend = computed(() =>
    account.value ? accountSpend(account.value) : 0
  );

  async function loadAccount() {
    if (!address.value) {
      account.value = null;
      isLoading.value = false;
      return;
    }

    try {
      isLoading.value = true;
      isError.value = false;
      account.value = await fetchAccount(address.value);
    } catch (err) {
      console.error('Failed to load API keys account', err);
      isError.value = true;
    } finally {
      isLoading.value = false;
    }
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

  async function createKey(name: string): Promise<string> {
    const result = await sendCreateKey(address.value, name);
    account.value = result.account;

    return result.key;
  }

  async function revokeKey(id: string) {
    account.value = await sendRevokeKey(address.value, id);
  }

  async function topUp(amount: number) {
    account.value = await sendTopUp(address.value, amount);
  }

  watch(address, loadAccount, { immediate: true });

  return {
    isLoading,
    isError,
    reload: loadAccount,
    isVerified,
    isVerifying,
    verify,
    keys,
    balance,
    usage,
    spend,
    createKey,
    revokeKey,
    topUp
  };
}
