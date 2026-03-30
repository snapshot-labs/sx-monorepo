import { useQueryClient } from '@tanstack/vue-query';
import {
  SNACK_KEYS,
  useEthPriceQuery,
  useSnackBalancesQuery,
  useSnackBuyMutation,
  useSnackMarketQuery,
  useSnackRedeemMutation,
  useSnackSellMutation
} from '@/queries/snack';
import { Proposal } from '@/types';

export function useSnack(proposal: Ref<Proposal>) {
  const { web3 } = useWeb3();
  const queryClient = useQueryClient();
  const account = toRef(() => web3.value.account);

  const { data: market, isPending: loading } = useSnackMarketQuery(proposal);
  const { data: balances } = useSnackBalancesQuery(proposal, account);
  const { data: ethPrice } = useEthPriceQuery();

  const buyMut = useSnackBuyMutation(proposal);
  const sellMut = useSnackSellMutation();
  const redeemMut = useSnackRedeemMutation();

  const marketAddress = computed(() => market.value?.address ?? null);
  const marketState = computed(() => market.value?.state ?? null);
  const userYesBalance = computed(() => balances.value?.yes ?? 0n);
  const userNoBalance = computed(() => balances.value?.no ?? 0n);
  const userEthBalance = computed(() => balances.value?.eth ?? 0n);
  const txPending = computed(
    () =>
      buyMut.isPending.value ||
      sellMut.isPending.value ||
      redeemMut.isPending.value
  );

  function buyOutcome(outcome: number, ethAmountStr: string) {
    buyMut.mutate({
      outcome,
      ethAmount: ethAmountStr,
      marketAddress: marketAddress.value
    });
  }

  function sellOutcome(outcome: number, tokenAmount: bigint, label: string) {
    if (!marketAddress.value) return;
    sellMut.mutate({
      outcome,
      tokenAmount,
      marketAddress: marketAddress.value,
      label
    });
  }

  function redeem() {
    if (!marketAddress.value) return;
    redeemMut.mutate({ marketAddress: marketAddress.value });
  }

  function refreshState() {
    queryClient.invalidateQueries({ queryKey: SNACK_KEYS.all });
  }

  return {
    marketAddress,
    marketState,
    userYesBalance,
    userNoBalance,
    userEthBalance,
    ethPrice,
    loading,
    txPending,
    buyOutcome,
    sellOutcome,
    redeem,
    refreshState
  };
}
