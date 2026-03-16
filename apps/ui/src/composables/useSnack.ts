import { ref, computed, watch, type Ref } from 'vue';
import { Web3Provider } from '@ethersproject/providers';
import type { Proposal } from '@/types';
import {
  buildReferenceUri,
  getFactoryReadonly,
  getMarketReadonly,
  getErc20Readonly,
  getFactoryContract,
  getMarketContract,
  getErc20Contract,
  fetchMarketState,
  ensureAnvilChain,
  waitForTx,
  parseUsdc,
  SNACK_FACTORY_ADDRESS,
  type MarketState
} from '@/helpers/snack';

type SnackInstance = ReturnType<typeof createSnack>;
const cache = new Map<string, SnackInstance>();

export function useSnack(proposal: Ref<Proposal>): SnackInstance {
  const id = proposal.value.id;
  const cached = cache.get(id);
  if (cached) return cached;

  const instance = createSnack(proposal);
  cache.set(id, instance);
  return instance;
}

function createSnack(proposal: Ref<Proposal>) {
  const { auth } = useWeb3();
  const uiStore = useUiStore();

  const marketAddress = ref<string | null>(null);
  const marketState = ref<MarketState | null>(null);
  const userYesBalance = ref(0n);
  const userNoBalance = ref(0n);
  const userUsdcBalance = ref(0n);
  const loading = ref(false);
  const txPending = ref(false);

  const referenceUri = computed(() => buildReferenceUri(proposal.value));

  async function loadMarket() {
    loading.value = true;
    try {
      const factory = getFactoryReadonly();
      const addr = await factory.getMarket(referenceUri.value);

      if (addr === '0x0000000000000000000000000000000000000000') {
        marketAddress.value = null;
        marketState.value = null;
      } else {
        marketAddress.value = addr;
        await refreshState();
      }

      // Always load USDC balance (read address from factory)
      await loadUsdcBalance();
    } catch (err) {
      console.error('Failed to load snack market', err);
    } finally {
      loading.value = false;
    }
  }

  async function loadUsdcBalance() {
    if (!auth.value || !SNACK_FACTORY_ADDRESS) return;
    try {
      const factory = getFactoryReadonly();
      const usdcAddr = await factory.usdc();
      console.log('[snack] USDC address:', usdcAddr, 'account:', auth.value.account);
      const usdc = getErc20Readonly(usdcAddr);
      const bal = await usdc.balanceOf(auth.value.account);
      console.log('[snack] USDC balance:', bal.toString());
      userUsdcBalance.value = bal.toBigInt();
    } catch (err) {
      console.error('Failed to load USDC balance', err);
    }
  }

  async function refreshState() {
    if (!marketAddress.value) return;

    const state = await fetchMarketState(marketAddress.value);
    marketState.value = state;

    // Load user balances if wallet is connected
    if (!auth.value) return;

    try {
      const market = getMarketReadonly(marketAddress.value);
      const account = auth.value.account;

      const [yesBal, noBal, usdcAddr] = await Promise.all([
        market.balanceOf(account, 0),
        market.balanceOf(account, 1),
        market.usdc()
      ]);

      userYesBalance.value = yesBal.toBigInt();
      userNoBalance.value = noBal.toBigInt();

      const usdc = getErc20Readonly(usdcAddr);
      const usdcBal = await usdc.balanceOf(account);
      userUsdcBalance.value = usdcBal.toBigInt();
    } catch (err) {
      console.error('Failed to load user balances', err);
    }
  }

  async function buyOutcome(outcome: number, usdcAmountStr: string) {
    if (!auth.value) return;

    const amount = parseUsdc(usdcAmountStr);
    if (amount === 0n) return;

    txPending.value = true;
    try {
      // Ensure wallet is on the Anvil chain
      console.log('[snack] ensureAnvilChain...');
      await ensureAnvilChain(auth.value.provider);

      // Fresh provider to clear stale network cache after chain switch
      const wp = new Web3Provider(auth.value.provider.provider, 'any');

      if (!marketAddress.value) {
        // First trade — create market and buy
        const factory = getFactoryContract(wp);

        // Get USDC address from factory (read via Anvil provider)
        const usdcAddr = await getFactoryReadonly().usdc();

        // Approve factory to spend USDC
        const usdc = getErc20Contract(usdcAddr, wp);
        console.log('[snack] sending approve tx...');
        const approveTx = await usdc.approve(SNACK_FACTORY_ADDRESS, amount);
        console.log('[snack] approve tx sent:', approveTx.hash);
        await waitForTx(approveTx.hash);
        console.log('[snack] approve confirmed');

        // Create and buy
        console.log('[snack] sending createAndBuy tx...');
        const tx = await factory.createAndBuy(
          referenceUri.value,
          outcome,
          amount
        );
        console.log('[snack] createAndBuy tx sent:', tx.hash);
        await waitForTx(tx.hash);
        console.log('[snack] createAndBuy confirmed');

        uiStore.addNotification(
          'success',
          `Market created and ${outcome === 0 ? 'Yes' : 'No'} tokens purchased`
        );
      } else {
        // Existing market — approve market and buy
        const market = getMarketContract(marketAddress.value, wp);

        // Read USDC address via Anvil provider
        const usdcAddr = await getMarketReadonly(marketAddress.value).usdc();

        const usdc = getErc20Contract(usdcAddr, wp);
        const allowance = await usdc.allowance(
          auth.value.account,
          marketAddress.value
        );

        if (allowance.toBigInt() < amount) {
          console.log('[snack] sending approve tx...');
          const approveTx = await usdc.approve(marketAddress.value, amount);
          console.log('[snack] approve tx sent:', approveTx.hash);
          await waitForTx(approveTx.hash);
          console.log('[snack] approve confirmed');
        }

        console.log('[snack] sending buyOutcome tx...');
        const tx = await market.buyOutcome(outcome, amount);
        console.log('[snack] buyOutcome tx sent:', tx.hash);
        await waitForTx(tx.hash);
        console.log('[snack] buyOutcome confirmed');

        uiStore.addNotification(
          'success',
          `Bought ${outcome === 0 ? 'Yes' : 'No'} tokens`
        );
      }

      await loadMarket();
    } catch (err: any) {
      console.error('Buy failed', err);
      uiStore.addNotification('error', err.reason ?? 'Transaction failed');
    } finally {
      txPending.value = false;
    }
  }

  async function sellOutcome(outcome: number, tokenAmount: bigint) {
    if (!auth.value || !marketAddress.value) return;

    txPending.value = true;
    try {
      await ensureAnvilChain(auth.value.provider);
      const wp = new Web3Provider(auth.value.provider.provider, 'any');

      const market = getMarketContract(marketAddress.value, wp);
      const tx = await market.sellOutcome(outcome, tokenAmount);
      await waitForTx(tx.hash);

      uiStore.addNotification(
        'success',
        `Sold ${outcome === 0 ? 'Yes' : 'No'} tokens`
      );
      await refreshState();
    } catch (err: any) {
      console.error('Sell failed', err);
      uiStore.addNotification('error', err.reason ?? 'Transaction failed');
    } finally {
      txPending.value = false;
    }
  }

  async function redeem() {
    if (!auth.value || !marketAddress.value) return;

    txPending.value = true;
    try {
      await ensureAnvilChain(auth.value.provider);
      const wp = new Web3Provider(auth.value.provider.provider, 'any');

      const market = getMarketContract(marketAddress.value, wp);
      const tx = await market.redeem();
      await waitForTx(tx.hash);

      uiStore.addNotification('success', 'Redeemed winnings');
      await refreshState();
    } catch (err: any) {
      console.error('Redeem failed', err);
      uiStore.addNotification('error', err.reason ?? 'Transaction failed');
    } finally {
      txPending.value = false;
    }
  }

  // Load market when proposal changes (reads don't need wallet)
  watch(
    () => proposal.value.id,
    () => {
      if (SNACK_FACTORY_ADDRESS) {
        loadMarket();
      }
    },
    { immediate: true }
  );

  // Refresh user balances when wallet connects
  watch(
    () => auth.value,
    () => {
      if (auth.value) {
        loadUsdcBalance();
        if (marketAddress.value) {
          refreshState();
        }
      }
    }
  );

  return {
    marketAddress,
    marketState,
    userYesBalance,
    userNoBalance,
    userUsdcBalance,
    loading,
    txPending,
    buyOutcome,
    sellOutcome,
    redeem,
    refreshState
  };
}
