<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { useQueryClient } from '@tanstack/vue-query';
import { AuctionState } from '@/components/AuctionStatus.vue';
import {
  AuctionNetworkId,
  formatPrice,
  Order,
  SellOrder
} from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { compareOrders, decodeOrder } from '@/helpers/auction/orders';
import { _n, sleep } from '@/helpers/utils';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import { METADATA as EVM_METADATA } from '@/networks/evm';
import {
  AUCTION_KEYS,
  useBiddingTokenPriceQuery,
  useBidsSummaryQuery,
  useUnclaimedOrdersQuery
} from '@/queries/auction';
import { TOTAL_NAV_HEIGHT } from '../../../tailwind.config';

const DEFAULT_TRANSACTION_PROGRESS_FN = async () => null;

const props = defineProps<{
  network: AuctionNetworkId;
  auctionId: string;
  auction: AuctionDetailFragment;
  totalSupply: bigint;
}>();

const { start, goToNextStep, isLastStep, currentStep } = useAuctionOrderFlow(
  toRef(props, 'network'),
  toRef(props, 'auction')
);
const { cancelSellOrder, claimFromParticipantOrder } = useAuctionActions(
  toRef(props, 'network'),
  toRef(props, 'auction')
);

const { auth, web3 } = useWeb3();
const queryClient = useQueryClient();

const isModalTransactionProgressOpen = ref(false);
const transactionProgressType = ref<
  'place-order' | 'cancel-order' | 'claim-orders' | null
>(null);
const cancelOrderFn = ref<() => Promise<string | null>>(
  DEFAULT_TRANSACTION_PROGRESS_FN
);

const chartType = ref<'price' | 'depth'>('price');
const sidebarType = ref<'bid' | 'referral'>('bid');

const auctionState = computed<AuctionState>(() => {
  const now = Math.floor(Date.now() / 1000);
  const endTime = parseInt(props.auction.endTimeTimestamp);

  if (now < endTime) return 'active';

  const currentBiddingAmount = BigInt(props.auction.currentBiddingAmount);
  const minFundingThreshold = BigInt(props.auction.minFundingThreshold);

  if (currentBiddingAmount < minFundingThreshold) return 'canceled';

  if (props.auction.ordersWithoutClaimed?.length) {
    if (!props.auction.clearingPriceOrder) return 'finalizing';

    return 'claiming';
  }

  return 'claimed';
});

const isAuctionOpen = computed(
  () => parseInt(props.auction.endTimeTimestamp) > Date.now() / 1000
);

const isAccountSupported = computed<boolean>(() => {
  return !!auth.value && EVM_CONNECTORS.includes(auth.value.connector.type);
});

const {
  data: userOrders,
  isError: isUserOrdersError,
  isLoading: isUserOrdersLoading
} = useBidsSummaryQuery({
  network: () => props.network,
  auction: () => props.auction,
  limit: 100,
  where: () => ({
    userAddress: web3.value.account?.toLowerCase()
  }),
  orderBy: 'price',
  orderDirection: 'desc',
  enabled: isAccountSupported
});

const {
  data: unclaimedOrders,
  isError: isUnclaimedOrdersError,
  isLoading: isUnclaimedOrdersLoading
} = useUnclaimedOrdersQuery({
  network: () => props.network,
  auction: () => props.auction,
  where: () => ({
    userAddress: web3.value.account?.toLowerCase()
  }),
  enabled: () => isAccountSupported.value
});

const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useBiddingTokenPriceQuery({
    network: () => props.network,
    auction: () => props.auction
  });

const userOrdersSummary = computed(() => {
  let auctioningTokenToClaim = 0n;
  let biddingTokenToClaim = 0n;

  const statuses: Record<
    string,
    'open' | 'filled' | 'partially-filled' | 'rejected' | 'claimed'
  > = {};
  const { clearingPriceOrder, volumeClearingPriceOrder } = props.auction;

  if (!unclaimedOrders.value || !userOrders.value) {
    return { statuses, auctioningTokenToClaim, biddingTokenToClaim };
  }

  const clearingPriceOrderDecoded = clearingPriceOrder
    ? decodeOrder(clearingPriceOrder)
    : null;

  userOrders.value.forEach(order => {
    const auctioningTokensPerBiddingToken =
      BigInt(props.auction.currentClearingOrderBuyAmount) /
      BigInt(props.auction.currentClearingOrderSellAmount);

    const orderSellAmount = BigInt(order.sellAmount);

    if (auctionState.value === 'canceled') {
      // [10]: All orders are rejected in canceled auctions, everyone gets their bidding tokens back
      statuses[order.id] = 'rejected';
      biddingTokenToClaim += orderSellAmount;
      return;
    }

    if (
      auctionState.value === 'active' ||
      !clearingPriceOrderDecoded ||
      !volumeClearingPriceOrder
    ) {
      statuses[order.id] = 'open';
      return;
    }

    if (!unclaimedOrders.value.has(order.id)) {
      statuses[order.id] = 'claimed';
      return;
    }

    const orderComparison = compareOrders(
      {
        userId: order.userId,
        buyAmount: order.buyAmount,
        sellAmount: order.sellAmount
      },
      clearingPriceOrderDecoded
    );

    if (orderComparison === 0) {
      // [25]: Order is partially filled. User gets refund for unfilled bidding tokens and gets auctioning tokens based on filled amount
      const settledBuyAmount =
        auctioningTokensPerBiddingToken * BigInt(volumeClearingPriceOrder);

      statuses[order.id] = 'partially-filled';
      biddingTokenToClaim += orderSellAmount - BigInt(volumeClearingPriceOrder);
      auctioningTokenToClaim += settledBuyAmount;
    } else if (orderComparison > 0) {
      // [17]: Order is fully filled. User doesn't get bidding tokens back, but gets auctioning tokens
      // equal to their sellAmount * currentClearingPrice
      const settledBuyAmount =
        auctioningTokensPerBiddingToken * orderSellAmount;

      statuses[order.id] = 'filled';
      auctioningTokenToClaim += settledBuyAmount;
    } else {
      // [24]: No amount left to claim, all remaining orders are rejected and users get their bidding tokens back
      statuses[order.id] = 'rejected';
      biddingTokenToClaim += orderSellAmount;
    }
  });

  return { statuses, auctioningTokenToClaim, biddingTokenToClaim };
});

const claimText = computed(() => {
  const { auctioningTokenToClaim, biddingTokenToClaim } =
    userOrdersSummary.value;

  const parts: string[] = [];
  if (auctioningTokenToClaim > 0n) {
    parts.push(
      `${formatTokenAmount(
        auctioningTokenToClaim.toString(),
        props.auction.decimalsAuctioningToken
      )} ${props.auction.symbolAuctioningToken}`
    );
  }
  if (biddingTokenToClaim > 0n) {
    parts.push(
      `${formatTokenAmount(
        biddingTokenToClaim.toString(),
        props.auction.decimalsBiddingToken
      )} ${props.auction.symbolBiddingToken}`
    );
  }

  return parts.length > 0 ? `Claim ${parts.join(' and ')}` : null;
});

const formatTokenAmount = (amount: string | undefined, decimals: string) =>
  amount ? _n(parseFloat(formatUnits(amount, decimals))) : '0';

const transactionProgressFn = computed<() => Promise<string | null>>(() => {
  if (transactionProgressType.value === 'place-order') {
    return currentStep.value.execute;
  }

  if (transactionProgressType.value === 'cancel-order') {
    return cancelOrderFn.value;
  }

  if (transactionProgressType.value === 'claim-orders') {
    return () => claimFromParticipantOrder(userOrders.value ?? []);
  }

  return DEFAULT_TRANSACTION_PROGRESS_FN;
});

async function invalidateQueries() {
  await sleep(5000);

  queryClient.invalidateQueries({
    queryKey: AUCTION_KEYS.auction(props.network, props.auction)
  });
}

async function moveToNextStep() {
  if (isLastStep.value) {
    invalidateQueries();
    resetTransactionProgress();
    return;
  }

  isModalTransactionProgressOpen.value = false;

  goToNextStep();

  nextTick(() => {
    isModalTransactionProgressOpen.value = true;
  });
}

function resetTransactionProgress() {
  isModalTransactionProgressOpen.value = false;
  transactionProgressType.value = null;
  cancelOrderFn.value = DEFAULT_TRANSACTION_PROGRESS_FN;
}

async function handlePlaceSellOrder(sellOrder: SellOrder) {
  transactionProgressType.value = 'place-order';

  start(sellOrder);
  isModalTransactionProgressOpen.value = true;
}

async function handleCancelSellOrder(order: Order) {
  transactionProgressType.value = 'cancel-order';
  cancelOrderFn.value = () => cancelSellOrder(order);

  isModalTransactionProgressOpen.value = true;
}

function handleClaimOrders() {
  transactionProgressType.value = 'claim-orders';

  isModalTransactionProgressOpen.value = true;
}

function handleTransactionConfirmed() {
  if (transactionProgressType.value === 'place-order') {
    return moveToNextStep();
  }

  invalidateQueries();
  resetTransactionProgress();
}
</script>

<template>
  <div class="flex-1 grow min-w-0">
    <div class="border-b px-4 py-3 flex justify-between items-center">
      <div class="flex flex-col">
        <h1 class="text-[24px]">Auction #{{ auctionId }}</h1>
        <AuctionStatus class="max-w-fit" :state="auctionState" />
      </div>
      <div class="flex flex-col">
        <span class="text-sm font-medium tracking-wider uppercase">
          Clearing price
        </span>
        <span class="text-[19px] font-medium text-skin-link">
          {{ formatPrice(auction.currentClearingPrice) }}
          {{ auction.symbolBiddingToken }}
        </span>
      </div>
    </div>

    <UiScrollerHorizontal with-buttons gradient="xxl">
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <AppLink
          aria-active="chartType === 'price'"
          @click="chartType = 'price'"
        >
          <UiLabel :is-active="chartType === 'price'" text="Clearing price" />
        </AppLink>
        <AppLink
          aria-active="chartType === 'depth'"
          @click="chartType = 'depth'"
        >
          <UiLabel :is-active="chartType === 'depth'" text="Depth" />
        </AppLink>
      </div>
    </UiScrollerHorizontal>

    <div class="w-full h-[355px] flex items-center justify-center">
      Graph is not available yet
    </div>

    <UiScrollerHorizontal with-buttons gradient="xxl">
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <AppLink v-if="isAccountSupported" aria-active="true">
          <UiLabel is-active text="My bids" />
        </AppLink>
        <AppLink :to="{ name: 'auction-bids' }">
          <UiLabel text="Bids" />
        </AppLink>
      </div>
    </UiScrollerHorizontal>

    <div class="space-y-4">
      <div v-if="isAccountSupported">
        <div class="overflow-hidden">
          <UiColumnHeader
            class="py-2 gap-3 uppercase text-sm tracking-wider"
            :sticky="false"
          >
            <div class="flex-1 min-w-[110px] truncate">Created</div>
            <div class="w-[200px] max-w-[200px] truncate">Amount</div>
            <div class="w-[200px] max-w-[200px] truncate">Max. price</div>
            <div class="w-[200px] max-w-[200px] truncate">Max. FDV</div>
            <div class="w-[200px] max-w-[200px] truncate">Status</div>
            <div class="min-w-[44px] lg:w-[60px] -mr-4" />
          </UiColumnHeader>
          <UiLoading
            v-if="
              isUserOrdersLoading ||
              isUnclaimedOrdersLoading ||
              isBiddingTokenPriceLoading
            "
            class="px-4 py-3 block"
          />
          <UiStateWarning
            v-else-if="isUserOrdersError || isUnclaimedOrdersError"
            class="px-4 py-3"
          >
            Failed to load bids.
          </UiStateWarning>
          <UiStateWarning
            v-else-if="userOrders?.length === 0"
            class="px-4 py-3"
          >
            You don't have any bids yet.
          </UiStateWarning>
          <div
            v-else-if="userOrders && typeof biddingTokenPrice === 'number'"
            class="divide-y divide-skin-border flex flex-col justify-center border-b"
          >
            <AuctionUserBid
              v-for="order in userOrders"
              :key="order.id"
              :order-status="userOrdersSummary.statuses[order.id]"
              :auction-id="auctionId"
              :auction="auction"
              :order="order"
              :bidding-token-price="biddingTokenPrice"
              :total-supply="totalSupply"
              @cancel="handleCancelSellOrder"
            />
          </div>
        </div>
        <UiButton
          v-if="claimText"
          class="w-full mt-4"
          primary
          @click="handleClaimOrders"
        >
          {{ claimText }}
        </UiButton>
      </div>
    </div>
  </div>

  <teleport to="#modal">
    <ModalTransactionProgress
      :open="isModalTransactionProgressOpen"
      :execute="transactionProgressFn"
      :chain-id="EVM_METADATA[network].chainId"
      :messages="
        transactionProgressType === 'place-order'
          ? currentStep.messages
          : undefined
      "
      @close="resetTransactionProgress"
      @confirmed="handleTransactionConfirmed"
      @cancelled="resetTransactionProgress"
    />
  </teleport>

  <UiResizableHorizontal
    id="proposal-sidebar"
    :default="340"
    :max="440"
    :min="340"
    class="shrink-0 md:h-full z-40 border-l-0 md:border-l bg-skin-bg"
  >
    <Affix data-testid="proposal-sidebar" :top="TOTAL_NAV_HEIGHT" :bottom="64">
      <div>
        <UiScrollerHorizontal with-buttons gradient="xxl">
          <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
            <AppLink
              :aria-active="sidebarType === 'bid'"
              @click="sidebarType = 'bid'"
            >
              <UiLabel :is-active="sidebarType === 'bid'" text="Place bid" />
            </AppLink>
            <AppLink
              :aria-active="sidebarType === 'referral'"
              @click="sidebarType = 'referral'"
            >
              <UiLabel
                :is-active="sidebarType === 'referral'"
                text="Referral"
              />
            </AppLink>
          </div>
        </UiScrollerHorizontal>

        <FormAuctionBid
          v-if="isAuctionOpen"
          :auction="auction"
          :network="network"
          :total-supply="totalSupply"
          :is-loading="isModalTransactionProgressOpen"
          :previous-orders="userOrders"
          @submit="handlePlaceSellOrder"
        />
      </div>
    </Affix>
  </UiResizableHorizontal>
</template>
