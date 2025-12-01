<script setup lang="ts">
import { getAddress } from '@ethersproject/address';
import { formatUnits } from '@ethersproject/units';
import { useQueryClient } from '@tanstack/vue-query';
import { AuctionState } from '@/components/AuctionStatus.vue';
import { AuctionNetworkId, formatPrice, SellOrder } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n, _t, sleep } from '@/helpers/utils';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import { METADATA as EVM_METADATA } from '@/networks/evm';
import {
  AUCTION_KEYS,
  useBiddingTokenPriceQuery,
  useBidsSummaryQuery
} from '@/queries/auction';

const props = defineProps<{
  network: AuctionNetworkId;
  auctionId: string;
  auction: AuctionDetailFragment;
}>();

const isModalTransactionProgressOpen = ref(false);
const isPlacingOrder = ref(false);

const { start, goToNextStep, isLastStep, currentStep } = useAuctionOrderFlow(
  toRef(props, 'network'),
  toRef(props, 'auction')
);
const { auth, web3 } = useWeb3();
const queryClient = useQueryClient();

const auctionState = computed<AuctionState>(() => {
  const now = Math.floor(Date.now() / 1000);
  const endTime = parseInt(props.auction.endTimeTimestamp);

  if (now < endTime) return 'active';

  const currentBiddingAmount = BigInt(props.auction.currentBiddingAmount);
  const minFundingThreshold = BigInt(props.auction.minFundingThreshold);

  if (currentBiddingAmount < minFundingThreshold) return 'canceled';

  if (props.auction.ordersWithoutClaimed?.length) return 'claiming';

  return 'claimed';
});

const isAuctionOpen = computed(
  () => parseInt(props.auction.endTimeTimestamp) > Date.now() / 1000
);

const isAccountSupported = computed<boolean>(() => {
  return !!auth.value && EVM_CONNECTORS.includes(auth.value.connector.type);
});

const {
  data: recentOrders,
  isError: isRecentOrdersError,
  isLoading: isRecentOrdersLoading
} = useBidsSummaryQuery({
  network: () => props.network,
  auction: () => props.auction
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
  enabled: isAccountSupported
});
const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useBiddingTokenPriceQuery({
    network: () => props.network,
    auction: () => props.auction
  });

const formatTokenAmount = (amount: string | undefined, decimals: string) =>
  amount ? _n(parseFloat(formatUnits(amount, decimals))) : '0';

const biddingParameters = computed(() => {
  const {
    symbolBiddingToken: symbol,
    decimalsBiddingToken,
    currentClearingPrice,
    exactOrder,
    minimumBiddingAmountPerOrder
  } = props.auction;

  return [
    {
      label: 'Current price',
      value: `${formatPrice(currentClearingPrice)} ${symbol}`
    },
    {
      label: 'Minimum sell price',
      value: `${formatPrice(exactOrder?.price)} ${symbol}`
    },
    {
      label: 'Minimal bidding amount per order',
      value: `${formatTokenAmount(minimumBiddingAmountPerOrder, decimalsBiddingToken)} ${symbol}`
    }
  ];
});

const auctionSettings = computed(() => {
  return [
    {
      label: 'Is atomic closure allowed?',
      value: props.auction.isAtomicClosureAllowed ? 'Yes' : 'No'
    },
    {
      label: 'Is private auction?',
      value: props.auction.isPrivateAuction ? 'Yes' : 'No'
    }
  ];
});

const timelineStates = computed(() => {
  const now = Math.floor(Date.now() / 1000);
  const toTimeline = (ts: string, label: string) => ({
    label,
    value: _t(parseInt(ts)),
    timestamp: parseInt(ts),
    isPast: parseInt(ts) <= now
  });

  const { startingTimeStamp, orderCancellationEndDate, endTimeTimestamp } =
    props.auction;

  return [
    toTimeline(startingTimeStamp, 'Auction start date'),
    toTimeline(orderCancellationEndDate, 'Last order cancellation date'),
    toTimeline(endTimeTimestamp, 'Auction end date')
  ].sort((a, b) => a.timestamp - b.timestamp);
});

const normalizedSignerAddress = computed(() => {
  const signer = props.auction.allowListSigner;
  if (!signer || signer === '0x') return null;
  try {
    return getAddress(signer.length > 42 ? `0x${signer.slice(26)}` : signer);
  } catch {
    return null;
  }
});

async function moveToNextStep() {
  if (isLastStep.value) {
    isPlacingOrder.value = false;

    await sleep(2000);

    queryClient.invalidateQueries({
      queryKey: AUCTION_KEYS.summary(props.network, props.auction)
    });
    queryClient.invalidateQueries({
      queryKey: AUCTION_KEYS.summary(props.network, props.auction, 100, {
        userAddress: web3.value.account?.toLowerCase()
      })
    });

    return;
  }

  isModalTransactionProgressOpen.value = false;

  goToNextStep();

  nextTick(() => {
    isModalTransactionProgressOpen.value = true;
  });
}

async function handlePlaceSellOrder(sellOrder: SellOrder) {
  start(sellOrder);

  isPlacingOrder.value = true;
  isModalTransactionProgressOpen.value = true;
}
</script>

<template>
  <div class="pt-5 max-w-[50rem] mx-auto px-4">
    <div class="space-y-4">
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <h1 class="text-[40px] leading-10">Auction #{{ auctionId }}</h1>
          <span
            class="inline-block px-2 py-1 text-xs rounded-full bg-skin-border text-skin-text"
          >
            {{ EVM_METADATA[network]?.name || 'Unknown' }}
          </span>
        </div>
        <AuctionStatus :state="auctionState" />
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-collection />
          Token information
        </h4>
        <div
          class="border border-skin-border rounded-lg divide-y divide-skin-border"
        >
          <div
            class="flex flex-col sm:flex-row sm:justify-between px-4 py-3 gap-3"
          >
            <div class="flex-1">
              <div class="text-skin-text text-sm mb-2">
                Auctioning token address
              </div>
              <a
                :href="
                  getGenericExplorerUrl(
                    EVM_METADATA[network]?.chainId,
                    auction.addressAuctioningToken,
                    'token'
                  ) || '#'
                "
                target="_blank"
                class="flex items-center gap-2"
              >
                <UiStamp
                  :id="auction.addressAuctioningToken"
                  type="token"
                  :size="32"
                />
                <div class="flex flex-col leading-[22px] min-w-0">
                  <h4
                    class="truncate"
                    v-text="auction.symbolAuctioningToken.slice(0, 9)"
                  />
                  <div class="text-[17px] truncate text-skin-text">
                    <UiAddress :address="auction.addressAuctioningToken" />
                  </div>
                </div>
              </a>
            </div>
            <div class="sm:text-right">
              <div class="text-skin-text text-sm mb-1">Total auctioned</div>
              <div class="text-skin-link text-xl">
                {{
                  formatTokenAmount(
                    auction.exactOrder?.sellAmount,
                    auction.decimalsAuctioningToken
                  )
                }}
                {{ auction.symbolAuctioningToken.slice(0, 9) }}
              </div>
            </div>
          </div>

          <div
            class="flex flex-col sm:flex-row sm:justify-between px-4 py-3 gap-3"
          >
            <div class="flex-1">
              <div class="text-skin-text text-sm mb-2">
                Bidding token address
              </div>
              <a
                :href="
                  getGenericExplorerUrl(
                    EVM_METADATA[network]?.chainId,
                    auction.addressBiddingToken,
                    'token'
                  ) || '#'
                "
                target="_blank"
                class="flex items-center gap-2"
              >
                <UiStamp
                  :id="auction.addressBiddingToken"
                  type="token"
                  :size="32"
                />
                <div class="flex flex-col leading-[22px] min-w-0">
                  <h4
                    class="truncate"
                    v-text="auction.symbolBiddingToken.slice(0, 9)"
                  />
                  <div class="text-[17px] truncate text-skin-text">
                    <UiAddress :address="auction.addressBiddingToken" />
                  </div>
                </div>
              </a>
            </div>
            <div class="sm:text-right">
              <div class="text-skin-text text-sm mb-1">
                Minimal funding threshold
              </div>
              <div class="text-skin-link text-xl">
                {{
                  formatTokenAmount(
                    auction.minFundingThreshold,
                    auction.decimalsBiddingToken
                  )
                }}
                {{ auction.symbolBiddingToken.slice(0, 9) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FormAuctionBid
        v-if="isAuctionOpen"
        :auction="auction"
        :network="network"
        :is-loading="isPlacingOrder"
        :previous-orders="userOrders"
        @submit="handlePlaceSellOrder"
      />

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-currency-dollar />
          Bidding parameters
        </h4>
        <div
          class="border border-skin-border rounded-lg divide-y divide-skin-border"
        >
          <div
            v-for="item in biddingParameters"
            :key="item.label"
            class="flex justify-between px-4 py-3"
          >
            <div class="text-skin-text">{{ item.label }}</div>
            <div class="text-skin-link">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-cog />
          Auction settings
        </h4>
        <div
          class="border border-skin-border rounded-lg divide-y divide-skin-border"
        >
          <div
            v-for="item in auctionSettings"
            :key="item.label"
            class="flex justify-between px-4 py-3"
          >
            <div class="text-skin-text">{{ item.label }}</div>
            <div class="text-skin-link">{{ item.value }}</div>
          </div>
          <div class="flex justify-between px-4 py-3">
            <div class="text-skin-text">Signer address</div>
            <div class="text-skin-link">
              <a
                v-if="normalizedSignerAddress"
                :href="
                  getGenericExplorerUrl(
                    EVM_METADATA[network]?.chainId,
                    normalizedSignerAddress,
                    'address'
                  ) || '#'
                "
                target="_blank"
              >
                <UiAddress :address="normalizedSignerAddress" />
              </a>
              <span v-else>None</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isAccountSupported">
        <UiEyebrow class="mb-3">Your bids</UiEyebrow>
        <div class="border rounded-lg overflow-hidden">
          <UiColumnHeader class="py-2 gap-3" :sticky="false">
            <div class="flex-1 min-w-[168px] truncate">Bidder</div>
            <div class="max-w-[144px] w-[144px] truncate">Date</div>
            <div class="max-w-[144px] w-[144px] truncate">Amount</div>
            <div class="max-w-[144px] w-[144px] text-right truncate">Price</div>
            <div class="min-w-[44px] lg:w-[60px] -mr-4" />
          </UiColumnHeader>
          <UiLoading
            v-if="isUserOrdersLoading || isBiddingTokenPriceLoading"
            class="px-4 py-3 block"
          />
          <UiStateWarning v-else-if="isUserOrdersError" class="px-4 py-3">
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
            class="divide-y divide-skin-border flex flex-col justify-center"
          >
            <AuctionBid
              v-for="order in userOrders"
              :key="order.id"
              with-actions
              :auction-id="auctionId"
              :auction="auction"
              :order="order"
              :bidding-token-price="biddingTokenPrice"
            />
          </div>
        </div>
      </div>

      <div>
        <UiEyebrow class="mb-3">Recent bids</UiEyebrow>
        <div class="border rounded-lg overflow-hidden">
          <UiColumnHeader class="py-2 gap-3" :sticky="false">
            <div class="flex-1 min-w-[168px] truncate">Bidder</div>
            <div class="max-w-[168px] w-[168px] truncate">Date</div>
            <div class="max-w-[168px] w-[168px] truncate">Amount</div>
            <div class="max-w-[168px] w-[168px] text-right truncate">Price</div>
          </UiColumnHeader>
          <UiLoading
            v-if="isRecentOrdersLoading || isBiddingTokenPriceLoading"
            class="px-4 py-3 block"
          />
          <UiStateWarning v-else-if="isRecentOrdersError" class="px-4 py-3">
            Failed to load bids.
          </UiStateWarning>
          <UiStateWarning
            v-else-if="recentOrders?.length === 0"
            class="px-4 py-3"
          >
            There are no bids here.
          </UiStateWarning>
          <div
            v-else-if="recentOrders && typeof biddingTokenPrice === 'number'"
            class="divide-y divide-skin-border flex flex-col justify-center"
          >
            <AuctionBid
              v-for="order in recentOrders"
              :key="order.id"
              :auction-id="auctionId"
              :auction="auction"
              :order="order"
              :bidding-token-price="biddingTokenPrice"
            />
          </div>
        </div>
        <AppLink
          v-if="recentOrders?.length"
          :to="{ name: 'auction-bids' }"
          class="mt-3 inline-block"
        >
          View all bids
        </AppLink>
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-clock />
          Timeline
        </h4>
        <div class="flex">
          <div class="mt-1 ml-2">
            <div
              v-for="(state, i) in timelineStates"
              :key="state.label"
              class="flex relative h-[60px] last:h-0"
            >
              <div
                class="absolute size-[15px] inline-block rounded-full left-[-7px] border-4 border-skin-bg"
                :class="state.isPast ? 'bg-skin-heading' : 'bg-skin-border'"
              />
              <div
                v-if="i < timelineStates.length - 1"
                class="border-l pr-4 mt-3"
                :class="timelineStates[i + 1].isPast && 'border-skin-heading'"
              />
            </div>
          </div>
          <div class="flex-auto leading-6">
            <div
              v-for="state in timelineStates"
              :key="state.label"
              class="mb-3 last:mb-0 h-[44px]"
            >
              <h4 v-text="state.label" />
              <div v-text="state.value" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <teleport to="#modal">
      <ModalTransactionProgress
        :open="isModalTransactionProgressOpen"
        :execute="currentStep.execute"
        :chain-id="EVM_METADATA[network].chainId"
        :messages="currentStep.messages"
        @close="
          isModalTransactionProgressOpen = false;
          isPlacingOrder = false;
        "
        @confirmed="moveToNextStep"
        @cancelled="
          isModalTransactionProgressOpen = false;
          isPlacingOrder = false;
        "
      />
    </teleport>
  </div>
</template>
