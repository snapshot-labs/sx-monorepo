<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _t, shortenAddress } from '@/helpers/utils';

defineProps<{
  auctionId: string;
  auction: AuctionDetailFragment;
  order: Order;
}>();
</script>

<template>
  <div class="flex justify-between items-center gap-3 py-3">
    <div
      class="leading-[22px] max-w-[218px] w-[218px] flex items-center space-x-3 truncate"
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
    </div>
    <div class="grow w-[20%] text-skin-link truncate">
      {{ _c(order.buyAmount, Number(auction.decimalsAuctioningToken)) }}
      {{ auction.symbolAuctioningToken }}
    </div>
    <div
      class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center truncate"
    >
      <TimeRelative v-slot="{ relativeTime }" :time="Number(order.timestamp)">
        <h4>{{ relativeTime }}</h4>
      </TimeRelative>
      <div class="text-[17px]">
        {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
      </div>
    </div>
    <h4 class="text-skin-link max-w-[144px] w-[144px] truncate text-right">
      {{ formatPrice(order.price) }}
      {{ auction.symbolBiddingToken }}
    </h4>
  </div>
</template>
