import {
  fetchAccount,
  getPlan,
  createKey as sendCreateKey,
  revokeKey as sendRevokeKey,
  upgradePlan as sendUpgradePlan
} from '@/helpers/keycard';
import { Account, ApiKey, Plan, PlanId } from '@/helpers/keycard/types';
import { sleep } from '@/helpers/utils';

// Simulates the wallet EIP-712 signature prompt. Replaced by a real
// _signTypedData call once keycard-api verifies signatures.
const fakeSign = () => sleep(1200);

// Simulates payment confirmation (schnaps / Stripe later).
const fakePayment = () => sleep(1400);

export function useApiKeys() {
  const { web3 } = useWeb3();

  const account = ref<Account | null>(null);
  const isLoading = ref(true);

  const address = computed(() => web3.value.account);
  const keys = computed<ApiKey[]>(() => account.value?.keys ?? []);
  const plan = computed<Plan>(() => getPlan(account.value?.plan ?? 'free'));
  const usage = computed(() =>
    keys.value.reduce(
      (total, key) => ({
        hub: total.hub + key.usage.hub,
        score: total.score + key.usage.score
      }),
      { hub: 0, score: 0 }
    )
  );

  async function loadAccount() {
    if (!address.value) {
      account.value = null;
      isLoading.value = false;
      return;
    }

    try {
      isLoading.value = true;
      account.value = await fetchAccount(address.value);
    } finally {
      isLoading.value = false;
    }
  }

  async function createKey(name: string): Promise<string> {
    await fakeSign();

    const result = await sendCreateKey(address.value, name);
    account.value = result.account;

    return result.key;
  }

  async function revokeKey(id: string) {
    await fakeSign();

    account.value = await sendRevokeKey(address.value, id);
  }

  async function upgradePlan(planId: PlanId) {
    await fakePayment();

    account.value = await sendUpgradePlan(address.value, planId);
  }

  watch(address, loadAccount, { immediate: true });

  return {
    isLoading,
    keys,
    plan,
    usage,
    createKey,
    revokeKey,
    upgradePlan
  };
}
