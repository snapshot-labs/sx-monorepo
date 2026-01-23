<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { useQueryClient } from '@tanstack/vue-query';
import UiColumnHeader from '@/components/Ui/ColumnHeader.vue';
import {
  AuctionNetworkId,
  getAuctionState,
  Order,
  SellOrder
} from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { compareOrders, decodeOrder } from '@/helpers/auction/orders';
import { _n, partitionDuration, sleep } from '@/helpers/utils';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import { METADATA as EVM_METADATA } from '@/networks/evm';
import {
  AUCTION_KEYS,
  useBiddingTokenPriceQuery,
  useBidsQuery,
  useBidsSummaryQuery,
  useUnclaimedOrdersQuery
} from '@/queries/auction';
import { TOTAL_NAV_HEIGHT } from '../../../tailwind.config';

const DEFAULT_TRANSACTION_PROGRESS_FN = async () => null;
const DEFAULT_CHART_TYPE = 'price';

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

const uiStore = useUiStore();
const { auth, web3 } = useWeb3();
const queryClient = useQueryClient();
const currentTimestamp = useTimestamp({ interval: 1000 });

const bidsHeader = ref<HTMLElement | null>(null);
const { x: bidsHeaderX } = useScroll(bidsHeader);

const isModalTransactionProgressOpen = ref(false);
const isModalShareOpen = ref(false);
const transactionProgressType = ref<
  'place-order' | 'cancel-order' | 'claim-orders' | null
>(null);
const cancelOrderFn = ref<() => Promise<string | null>>(
  DEFAULT_TRANSACTION_PROGRESS_FN
);
const txId = ref<string | null>(null);
const sellOrder = ref<SellOrder | null>(null);

const chartType = ref<'price' | 'depth'>(DEFAULT_CHART_TYPE);
const sidebarType = ref<'bid' | 'referral'>('bid');
const bidsType = ref<'userBids' | 'allBids'>('userBids');

const auctionState = computed(() =>
  getAuctionState(props.auction, currentTimestamp.value)
);

const isAuctionOpen = computed(
  () => parseInt(props.auction.endTimeTimestamp) > currentTimestamp.value / 1000
);

const countdown = computed(() => {
  if (isAuctionOpen.value === false) {
    return null;
  }

  const diff =
    parseInt(props.auction.endTimeTimestamp) -
    Math.floor(currentTimestamp.value / 1000);

  return partitionDuration(diff);
});

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
  where: () => ({
    userAddress: web3.value.account?.toLowerCase()
  }),
  orderBy: 'price',
  orderDirection: 'desc',
  enabled: () => isAccountSupported.value && bidsType.value === 'userBids'
});

const {
  data: allOrders,
  fetchNextPage: fetchAllOrdersNextPage,
  hasNextPage: hasAllOrdersNextPage,
  isPending: isAllOrdersPending,
  isFetchingNextPage: isAllOrdersFetchingNextPage,
  isError: isAllOrdersError
} = useBidsQuery({
  network: () => props.network,
  auction: () => props.auction,
  enabled: () => bidsType.value === 'allBids'
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

const fdv = computed(
  () =>
    Number(props.auction.currentClearingPrice) *
    Number(
      props.totalSupply / 10n ** BigInt(props.auction.decimalsAuctioningToken)
    )
);

const volume = computed(
  () =>
    Number(props.auction.currentBiddingAmount) /
    10 ** Number(props.auction.decimalsBiddingToken)
);

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
    const orderSellAmount = BigInt(order.sellAmount);

    if (!unclaimedOrders.value.has(order.id)) {
      statuses[order.id] = 'claimed';
      return;
    }

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

    const auctioningTokensPerBiddingToken =
      BigInt(props.auction.currentClearingOrderBuyAmount) /
      BigInt(props.auction.currentClearingOrderSellAmount);

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
    isModalTransactionProgressOpen.value = false;

    isModalShareOpen.value = true;
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
  sellOrder.value = null;
  txId.value = null;
}

async function handlePlaceSellOrder(order: SellOrder) {
  transactionProgressType.value = 'place-order';
  sellOrder.value = order;

  start(order);
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

function handleTransactionConfirmed(tx: string | null) {
  if (transactionProgressType.value === 'place-order') {
    if (tx) {
      txId.value = tx;
    }
    return moveToNextStep();
  } else if (transactionProgressType.value === 'cancel-order') {
    uiStore.addNotification('success', 'Your bid has been cancelled.');
  }
  invalidateQueries();
  resetTransactionProgress();
}

function handleAllOrdersEndReached() {
  if (!hasAllOrdersNextPage.value) return;

  fetchAllOrdersNextPage();
}

function handleScrollEvent(target: HTMLElement) {
  bidsHeaderX.value = target.scrollLeft;
}

watch(volume, () => {
  if (volume.value === 0 && chartType.value !== DEFAULT_CHART_TYPE) {
    chartType.value = DEFAULT_CHART_TYPE;
  }
});
</script>

<template>
  <div class="flex-1 grow min-w-0" v-bind="$attrs">
    <div class="border-b p-4 flex flex-col gap-4">
      <div class="flex gap-3">
        <UiBadgeNetwork :id="network" :size="24">
          <UiStamp
            :id="auction.addressAuctioningToken"
            :size="64"
            type="token"
            class="rounded-full"
          />
        </UiBadgeNetwork>
        <div class="flex flex-col">
          <h1 class="text-[24px]">{{ auction.symbolAuctioningToken }}</h1>
          <AuctionStatus class="max-w-fit" :state="auctionState" />
        </div>
      </div>
      <div
        class="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-3"
      >
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-8">
          <AuctionCounter
            :title="isAuctionOpen ? 'Current price' : 'Clearing price'"
            :amount="
              _n(auction.currentClearingPrice, 'standard', {
                maximumFractionDigits: 6
              })
            "
            :symbol="auction.symbolBiddingToken"
            :subamount="`$${_n(
              biddingTokenPrice
                ? Number(auction.currentClearingPrice) * biddingTokenPrice
                : 0,
              'standard',
              {
                maximumFractionDigits: 2
              }
            )}`"
          />
          <AuctionCounter
            :title="isAuctionOpen ? 'Current FDV' : 'Clearing FDV'"
            :amount="_n(fdv, 'compact')"
            :symbol="auction.symbolBiddingToken"
            :subamount="`$${_n(
              biddingTokenPrice ? fdv * biddingTokenPrice : 0,
              'standard',
              {
                maximumFractionDigits: 0
              }
            )}`"
          />
          <AuctionCounter
            :title="isAuctionOpen ? 'Current volume' : 'Total volume'"
            :amount="_n(volume, 'compact')"
            :symbol="auction.symbolBiddingToken"
            :subamount="`$${_n(
              biddingTokenPrice ? volume * biddingTokenPrice : 0,
              'standard',
              {
                maximumFractionDigits: 0
              }
            )}`"
          />
        </div>
        <div v-if="countdown" class="flex gap-3.5">
          <div
            v-if="countdown.days > 0"
            class="flex flex-col items-center uppercase min-w-6"
          >
            <span class="text-[32px] tracking-wider text-rose-500">
              {{ String(countdown.days).padStart(2, '0') }}
            </span>
            <span>days</span>
          </div>
          <div class="flex flex-col items-center uppercase min-w-6">
            <span class="text-[32px] tracking-wider text-rose-500">
              {{ String(countdown.hours).padStart(2, '0') }}
            </span>
            <span>hrs.</span>
          </div>
          <div class="flex flex-col items-center uppercase min-w-6">
            <span class="text-[32px] tracking-wider text-rose-500">
              {{ String(countdown.minutes).padStart(2, '0') }}
            </span>
            <span>min.</span>
          </div>
          <div class="flex flex-col items-center uppercase min-w-6">
            <span class="text-[32px] tracking-wider text-rose-500">
              {{ String(countdown.seconds).padStart(2, '0') }}
            </span>
            <span>sec.</span>
          </div>
        </div>
      </div>
    </div>

    <UiScrollerHorizontal with-buttons gradient="xxl">
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <AppLink
          :aria-active="chartType === 'price'"
          @click="chartType = 'price'"
        >
          <UiLabel :is-active="chartType === 'price'" text="Clearing price" />
        </AppLink>
        <AppLink
          v-if="volume"
          :aria-active="chartType === 'depth'"
          @click="chartType = 'depth'"
        >
          <UiLabel :is-active="chartType === 'depth'" text="Depth" />
        </AppLink>
      </div>
    </UiScrollerHorizontal>

    <AuctionChartPriceHistory
      v-if="chartType === 'price'"
      :auction="auction"
      :network="network"
      class="min-h-[355px] p-4 pr-3"
    />
    <AuctionChartPriceDepth
      v-else-if="chartType === 'depth'"
      :auction="auction"
      :network="network"
      class="min-h-[355px] p-4"
    />

    <UiScrollerHorizontal with-buttons gradient="xxl">
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <AppLink
          :aria-active="bidsType === 'userBids'"
          @click="bidsType = 'userBids'"
        >
          <UiLabel :is-active="bidsType === 'userBids'" text="My bids" />
        </AppLink>
        <AppLink
          :aria-active="bidsType === 'allBids'"
          @click="bidsType = 'allBids'"
        >
          <UiLabel :is-active="bidsType === 'allBids'" text="Bids" />
        </AppLink>
      </div>
    </UiScrollerHorizontal>

    <div v-if="bidsType === 'userBids'" class="space-y-4">
      <UiStateWarning v-if="!isAccountSupported" class="px-4 py-3">
        Log in to view your bids.
      </UiStateWarning>
      <template v-else>
        <div class="overflow-hidden">
          <UiColumnHeader
            :ref="
              ref =>
                (bidsHeader =
                  (ref as InstanceType<typeof UiColumnHeader> | null)
                    ?.container ?? null)
            "
            class="!px-0 py-2 uppercase text-sm tracking-wider overflow-hidden"
            :sticky="false"
          >
            <div
              class="flex px-4 gap-3 uppercase text-sm tracking-wider min-w-[735px] w-full"
            >
              <div class="flex-1 min-w-[110px] truncate">Created</div>
              <div class="w-[200px] max-w-[200px] truncate">Amount</div>
              <div class="w-[200px] max-w-[200px] truncate">Max. price</div>
              <div class="w-[200px] max-w-[200px] truncate">Max. FDV</div>
              <div class="w-[200px] max-w-[200px] truncate">Status</div>
              <div class="min-w-[44px] lg:w-[60px]" />
            </div>
          </UiColumnHeader>
          <UiScrollerHorizontal @scroll="handleScrollEvent">
            <div class="min-w-[735px]">
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
                  :network-id="network"
                  :auction-id="auctionId"
                  :auction="auction"
                  :order="order"
                  :order-status="userOrdersSummary.statuses[order.id]"
                  :bidding-token-price="biddingTokenPrice"
                  :total-supply="totalSupply"
                  @cancel="handleCancelSellOrder"
                />
              </div>
            </div>
          </UiScrollerHorizontal>
        </div>
        <div class="px-4">
          <UiButton
            v-if="claimText"
            class="w-full"
            primary
            @click="handleClaimOrders"
          >
            {{ claimText }}
          </UiButton>
        </div>
      </template>
    </div>
    <div v-else-if="bidsType === 'allBids'" class="space-y-4">
      <div class="overflow-hidden">
        <UiColumnHeader
          :ref="
            ref =>
              (bidsHeader =
                (ref as InstanceType<typeof UiColumnHeader> | null)
                  ?.container ?? null)
          "
          class="!px-0 py-2 uppercase text-sm tracking-wider overflow-hidden"
          :sticky="false"
        >
          <div
            class="flex px-4 gap-3 uppercase text-sm tracking-wider min-w-[880px] w-full"
          >
            <div class="flex-1 min-w-[168px] truncate">Bidder</div>
            <div class="w-[200px] max-w-[200px] truncate">Created</div>
            <div class="w-[200px] max-w-[200px] truncate">Amount</div>
            <div class="w-[200px] max-w-[200px] truncate">Max. price</div>
            <div class="w-[200px] max-w-[200px] truncate">Max. FDV</div>
            <div class="w-[200px] max-w-[200px] truncate">Status</div>
            <div class="min-w-[44px] lg:w-[60px]" />
          </div>
        </UiColumnHeader>
        <UiScrollerHorizontal @scroll="handleScrollEvent">
          <div class="min-w-[880px]">
            <UiLoading
              v-if="isAllOrdersPending || isBiddingTokenPriceLoading"
              class="px-4 py-3 block"
            />
            <UiStateWarning v-else-if="isAllOrdersError" class="px-4 py-3">
              Failed to load bids.
            </UiStateWarning>
            <UiStateWarning
              v-else-if="allOrders?.pages.flat().length === 0"
              class="px-4 py-3"
            >
              There are no bids yet.
            </UiStateWarning>
            <UiContainerInfiniteScroll
              v-else-if="allOrders && typeof biddingTokenPrice === 'number'"
              class="divide-y divide-skin-border flex flex-col justify-center border-b"
              :loading-more="isAllOrdersFetchingNextPage"
              @end-reached="handleAllOrdersEndReached"
            >
              <template #loading>
                <UiLoading class="px-4 py-3 block" />
              </template>
              <AuctionBid
                v-for="order in allOrders?.pages.flat()"
                :key="order.id"
                :network-id="network"
                :auction-id="auctionId"
                :auction="auction"
                :order="order"
                :bidding-token-price="biddingTokenPrice"
                :total-supply="totalSupply"
              />
            </UiContainerInfiniteScroll>
          </div>
        </UiScrollerHorizontal>
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

  <div
    class="w-full max-w-[400px] md:h-full z-40 border-l-0 md:border-l bg-skin-bg"
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
          v-if="sidebarType === 'bid' && isAuctionOpen"
          :auction="auction"
          :network="network"
          :bidding-token-price="biddingTokenPrice"
          :total-supply="totalSupply"
          :is-loading="isModalTransactionProgressOpen"
          :previous-orders="userOrders"
          @submit="handlePlaceSellOrder"
        />

        <FormAuctionReferral
          v-else-if="sidebarType === 'referral'"
          :network="network"
          :auction="auction"
        />
      </div>
    </Affix>
  </div>
  <teleport to="#modal">
    <ModalShare
      v-if="sellOrder"
      :open="isModalShareOpen"
      :tx-id="txId"
      :show-icon="true"
      :shareable="sellOrder"
      :network="network"
      :messages="{
        title: 'Bid success!'
      }"
      :type="'bid'"
      @close="
        resetTransactionProgress();
        isModalShareOpen = false;
      "
    />
  </teleport>
</template>
