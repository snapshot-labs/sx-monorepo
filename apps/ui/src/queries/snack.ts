import { Web3Provider } from '@ethersproject/providers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getTokenPrices } from '@/helpers/coingecko';
import { ETH_CONTRACT } from '@/helpers/constants';
import {
  buildReferenceUri,
  fetchMarketState,
  getFactoryContract,
  getFactoryReadonly,
  getMarketContract,
  getMarketReadonly,
  getReadProvider,
  MarketState,
  parseEth,
  SNACK_CHAIN_ID,
  SNACK_FACTORY_ADDRESS,
  waitForTx
} from '@/helpers/snack';
import { verifyNetwork } from '@/helpers/utils';
import { Proposal } from '@/types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const SNACK_KEYS = {
  all: ['snack'] as const,
  market: (referenceUri: MaybeRefOrGetter<string>) =>
    [...SNACK_KEYS.all, 'market', referenceUri] as const,
  balances: (
    referenceUri: MaybeRefOrGetter<string>,
    account: MaybeRefOrGetter<string>
  ) => [...SNACK_KEYS.all, 'balances', referenceUri, account] as const,
  ethPrice: ['snack', 'ethPrice'] as const
};

export type SnackMarketData = {
  address: string | null;
  state: MarketState | null;
};

export type SnackBalancesData = {
  yes: bigint;
  no: bigint;
  eth: bigint;
};

async function fetchSnackMarket(
  referenceUri: string
): Promise<SnackMarketData> {
  const factory = getFactoryReadonly();
  const addr = await factory.getMarket(referenceUri);

  if (addr === ZERO_ADDRESS) {
    return { address: null, state: null };
  }

  const state = await fetchMarketState(addr);
  return { address: addr, state };
}

async function fetchSnackBalances(
  referenceUri: string,
  account: string
): Promise<SnackBalancesData> {
  const factory = getFactoryReadonly();
  const [marketAddr, ethBal] = await Promise.all([
    factory.getMarket(referenceUri),
    getReadProvider().getBalance(account)
  ]);

  if (marketAddr === ZERO_ADDRESS) {
    return { yes: 0n, no: 0n, eth: ethBal.toBigInt() };
  }

  const market = getMarketReadonly(marketAddr);
  const [yesBal, noBal] = await Promise.all([
    market.balanceOf(account, 0),
    market.balanceOf(account, 1)
  ]);

  return {
    yes: yesBal.toBigInt(),
    no: noBal.toBigInt(),
    eth: ethBal.toBigInt()
  };
}

export function useSnackMarketQuery(proposal: MaybeRefOrGetter<Proposal>) {
  const referenceUri = computed(() => buildReferenceUri(toValue(proposal)));

  return useQuery({
    queryKey: SNACK_KEYS.market(toRef(() => referenceUri.value)),
    queryFn: () => fetchSnackMarket(referenceUri.value),
    enabled: () => !!SNACK_FACTORY_ADDRESS,
    staleTime: 10_000
  });
}

export function useSnackBalancesQuery(
  proposal: MaybeRefOrGetter<Proposal>,
  account: MaybeRefOrGetter<string>
) {
  const referenceUri = computed(() => buildReferenceUri(toValue(proposal)));

  return useQuery({
    queryKey: SNACK_KEYS.balances(
      toRef(() => referenceUri.value),
      toRef(() => toValue(account))
    ),
    queryFn: () => fetchSnackBalances(referenceUri.value, toValue(account)),
    enabled: () => !!SNACK_FACTORY_ADDRESS && !!toValue(account),
    staleTime: 5_000
  });
}

export function useEthPriceQuery() {
  return useQuery({
    queryKey: SNACK_KEYS.ethPrice,
    queryFn: async () => {
      const prices = await getTokenPrices('ethereum', [ETH_CONTRACT]);
      return prices[ETH_CONTRACT]?.usd ?? 0;
    },
    staleTime: 60_000
  });
}

export function useSnackBuyMutation(proposal: MaybeRefOrGetter<Proposal>) {
  const { auth } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification, addPendingTransaction } = useUiStore();
  const referenceUri = computed(() => buildReferenceUri(toValue(proposal)));
  const choices = computed(() => toValue(proposal).choices);

  return useMutation({
    mutationFn: async ({
      outcome,
      ethAmount,
      marketAddress
    }: {
      outcome: number;
      ethAmount: string;
      marketAddress: string | null;
    }) => {
      if (!auth.value) throw new Error('Not connected');
      const amount = parseEth(ethAmount);
      if (amount === 0n) throw new Error('Amount is 0');

      await verifyNetwork(auth.value.provider, SNACK_CHAIN_ID);
      const wp = new Web3Provider(auth.value.provider.provider, 'any');

      if (!marketAddress) {
        const factory = getFactoryContract(wp);
        const tx = await factory.createAndBuy(referenceUri.value, outcome, {
          value: amount
        });
        addPendingTransaction(tx.hash, SNACK_CHAIN_ID);
        await waitForTx(tx.hash);
        return { outcome, isNew: true };
      } else {
        const market = getMarketContract(marketAddress, wp);
        const tx = await market.buyOutcome(outcome, { value: amount });
        addPendingTransaction(tx.hash, SNACK_CHAIN_ID);
        await waitForTx(tx.hash);
        return { outcome, isNew: false };
      }
    },
    onSuccess: ({ outcome, isNew }) => {
      const label = choices.value[outcome] ?? (outcome === 0 ? 'Yes' : 'No');
      addNotification(
        'success',
        isNew
          ? `Market created and bought ${label} shares`
          : `Bought ${label} shares`
      );
      queryClient.invalidateQueries({ queryKey: SNACK_KEYS.all });
    },
    onError: (err: any) => {
      addNotification('error', err.reason ?? 'Transaction failed');
    }
  });
}

export function useSnackSellMutation() {
  const { auth } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification, addPendingTransaction } = useUiStore();

  return useMutation({
    mutationFn: async ({
      outcome,
      tokenAmount,
      marketAddress,
      label
    }: {
      outcome: number;
      tokenAmount: bigint;
      marketAddress: string;
      label: string;
    }) => {
      if (!auth.value) throw new Error('Not connected');

      await verifyNetwork(auth.value.provider, SNACK_CHAIN_ID);
      const wp = new Web3Provider(auth.value.provider.provider, 'any');

      const market = getMarketContract(marketAddress, wp);
      const tx = await market.sellOutcome(outcome, tokenAmount);
      addPendingTransaction(tx.hash, SNACK_CHAIN_ID);
      await waitForTx(tx.hash);
      return { label };
    },
    onSuccess: ({ label }) => {
      addNotification('success', `Sold ${label} shares`);
      queryClient.invalidateQueries({ queryKey: SNACK_KEYS.all });
    },
    onError: (err: any) => {
      addNotification('error', err.reason ?? 'Transaction failed');
    }
  });
}

export function useSnackRedeemMutation() {
  const { auth } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification, addPendingTransaction } = useUiStore();

  return useMutation({
    mutationFn: async ({ marketAddress }: { marketAddress: string }) => {
      if (!auth.value) throw new Error('Not connected');

      await verifyNetwork(auth.value.provider, SNACK_CHAIN_ID);
      const wp = new Web3Provider(auth.value.provider.provider, 'any');

      const market = getMarketContract(marketAddress, wp);
      const tx = await market.redeem();
      addPendingTransaction(tx.hash, SNACK_CHAIN_ID);
      await waitForTx(tx.hash);
    },
    onSuccess: () => {
      addNotification('success', 'Redeemed winnings');
      queryClient.invalidateQueries({ queryKey: SNACK_KEYS.all });
    },
    onError: (err: any) => {
      addNotification('error', err.reason ?? 'Transaction failed');
    }
  });
}
