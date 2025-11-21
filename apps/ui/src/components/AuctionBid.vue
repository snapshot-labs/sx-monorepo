<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _n, _p, _t, shortenAddress } from '@/helpers/utils';

const props = defineProps<{
  auctionId: string;
  auction: AuctionDetailFragment;
  order: Order;
  biddingTokenPrice: number;
}>();

function getOrderPercantage(order: Order) {
  return Number(order.buyAmount) / Number(props.auction.exactOrder.sellAmount);
}
</script>

<template>
  <div class="flex justify-between items-center gap-3 py-3 px-4 relative">
    <div
      class="right-0 top-0 h-[8px] absolute choice-bg opacity-20 _1"
      :style="{
        width: `${Math.min(getOrderPercantage(order) * 100, 100).toFixed(2)}%`
      }"
    />
    <div class="leading-[22px] flex-1 flex items-center space-x-3 truncate">
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
    </div>
    <div
      class="leading-[22px] max-w-[168px] w-[168px] flex flex-col justify-center truncate"
    >
      <TimeRelative v-slot="{ relativeTime }" :time="Number(order.timestamp)">
        <h4>{{ relativeTime }}</h4>
      </TimeRelative>
      <div class="text-[17px]">
        {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
      </div>
    </div>
    <div class="max-w-[168px] w-[168px] truncate">
      <h4 class="text-skin-link truncate">
        {{ _c(order.buyAmount, Number(auction.decimalsAuctioningToken)) }}
        {{ auction.symbolAuctioningToken }}
      </h4>
      <div class="text-[17px] truncate">
        {{ _p(getOrderPercantage(order)) }}
      </div>
    </div>
    <div class="max-w-[168px] w-[168px] truncate text-right">
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
  </div>
</template>
