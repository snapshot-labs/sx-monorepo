<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _n, _p, _t } from '@/helpers/utils';

const props = defineProps<{
  auctionId: string;
  auction: AuctionDetailFragment;
  order: Order;
  orderStatus?: 'open' | 'filled' | 'partially-filled' | 'rejected' | 'claimed';
  biddingTokenPrice: number;
}>();

const emit = defineEmits<{
  (e: 'cancel', order: Order): void;
}>();

const isCancellable = computed(() => {
  return Number(props.auction.orderCancellationEndDate) * 1000 > Date.now();
});

const orderPercentage = computed(() => {
  return (
    Number(props.order.buyAmount) / Number(props.auction.exactOrder.sellAmount)
  );
});
</script>

<template>
  <div
    class="flex justify-between items-center gap-3 py-3 px-4 relative leading-[22px]"
  >
    <div
      class="right-0 top-0 h-[8px] absolute choice-bg opacity-20 _1"
      :style="{
        width: `${Math.min(orderPercentage * 100, 100).toFixed(2)}%`
      }"
    />
    <div class="min-w-[100px] text-skin-link truncate">
      <span v-if="orderStatus === 'open'">Open</span>
      <span v-else-if="orderStatus === 'claimed'" class="text-skin-success">
        Claimed
      </span>
      <span v-else-if="orderStatus === 'filled'" class="text-skin-success">
        Filled
      </span>
      <span
        v-else-if="orderStatus === 'partially-filled'"
        class="text-yellow-500"
      >
        Partially-filled
      </span>
      <span v-else-if="orderStatus === 'rejected'" class="text-skin-danger">
        Rejected
      </span>
    </div>
    <div class="w-[168px] max-w-[168px] flex flex-col justify-center truncate">
      <TimeRelative v-slot="{ relativeTime }" :time="Number(order.timestamp)">
        <h4>{{ relativeTime }}</h4>
      </TimeRelative>
      <div class="text-[17px]">
        {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
      </div>
    </div>
    <div class="w-[168px] max-w-[168px] truncate">
      <h4 class="text-skin-link truncate">
        {{ _c(order.buyAmount, Number(auction.decimalsAuctioningToken)) }}
        {{ auction.symbolAuctioningToken }}
      </h4>
      <div class="text-[17px] truncate">
        {{ _p(orderPercentage) }}
      </div>
    </div>
    <div class="flex-1 min-w-[144px] text-right truncate">
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
            @click="emit('cancel', order)"
          >
            <IS-x-mark :width="16" />
            Cancel bid
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
  </div>
</template>
