<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { cancelSellOrder } from '@/helpers/auction/actions';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _n, _p, _t, shortenAddress } from '@/helpers/utils';

const props = withDefaults(
  defineProps<{
    auctionId: string;
    auction: AuctionDetailFragment;
    order: Order;
    biddingTokenPrice: number;
    withActions?: boolean;
  }>(),
  {
    withActions: false
  }
);

const isModalTransactionProgressOpen = ref(false);
const cancelFn = ref<any>(() => {});

const { getSigner } = useNetworkSigner('sep');
const uiStore = useUiStore();

const isCancellable = computed(() => {
  return Number(props.auction.orderCancellationEndDate) * 1000 > Date.now();
});

const orderPercentage = computed(() => {
  return (
    Number(props.order.buyAmount) / Number(props.auction.exactOrder.sellAmount)
  );
});

const columnSize = computed(() => {
  return props.withActions
    ? 'w-[144px] max-w-[144px]'
    : 'w-[168px] max-w-[168px]';
});

async function handleCancelBid(order: Order) {
  const signer = await getSigner();
  if (!signer) return;

  cancelFn.value = async () => {
    const tx = await cancelSellOrder(
      signer,
      { network: 'sep', ...props.auction },
      order
    );
    uiStore.addPendingTransaction(tx.hash, 11155111);

    return tx.hash;
  };

  isModalTransactionProgressOpen.value = true;
}
</script>

<template>
  <div class="flex justify-between items-center gap-3 py-3 px-4 relative">
    <div
      class="right-0 top-0 h-[8px] absolute choice-bg opacity-20 _1"
      :style="{
        width: `${Math.min(orderPercentage * 100, 100).toFixed(2)}%`
      }"
    />
    <div class="flex-1 min-w-[168px] truncate">
      <AppLink
        class="leading-[22px] w-fit flex items-center space-x-3 truncate"
        :to="{ name: 'user', params: { user: order.userAddress } }"
      >
        <UiStamp :id="order.userAddress" :size="32" />
        <div class="flex flex-col truncate">
          <h4
            class="truncate"
            v-text="order.name || shortenAddress(order.userAddress)"
          />
          <UiAddress
            :address="order.userAddress"
            class="text-[17px] text-skin-text truncate"
          />
        </div>
      </AppLink>
    </div>
    <div
      class="leading-[22px] flex flex-col justify-center truncate"
      :class="columnSize"
    >
      <TimeRelative v-slot="{ relativeTime }" :time="Number(order.timestamp)">
        <h4>{{ relativeTime }}</h4>
      </TimeRelative>
      <div class="text-[17px]">
        {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
      </div>
    </div>
    <div class="truncate" :class="columnSize">
      <h4 class="text-skin-link truncate">
        {{ _c(order.buyAmount, Number(auction.decimalsAuctioningToken)) }}
        {{ auction.symbolAuctioningToken }}
      </h4>
      <div class="text-[17px] truncate">
        {{ _p(orderPercentage) }}
      </div>
    </div>
    <div class="truncate text-right" :class="columnSize">
      <h4 class="text-skin-link truncate">
        {{ formatPrice(order.price) }}
        {{ auction.symbolBiddingToken }}
      </h4>
      <div class="truncate">
        ${{
          _n(Number(order.price) * biddingTokenPrice, 'standard', {
            maximumFractionDigits: 2
          })
        }}
      </div>
    </div>
    <div
      v-if="withActions"
      class="min-w-[44px] lg:w-[60px] flex items-center justify-center -mr-4"
    >
      <UiDropdown>
        <template #button>
          <button type="button">
            <IH-dots-horizontal class="text-skin-link" />
          </button>
        </template>
        <template #items>
          <UiDropdownItem
            :disabled="!isCancellable"
            @click="handleCancelBid(order)"
          >
            <IS-x-mark :width="16" />
            Cancel bid
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
    <teleport to="#modal">
      <ModalTransactionProgress
        :open="isModalTransactionProgressOpen"
        :execute="cancelFn"
        :chain-id="'11155111'"
        @close="isModalTransactionProgressOpen = false"
        @cancelled="isModalTransactionProgressOpen = false"
      />
    </teleport>
  </div>
</template>
