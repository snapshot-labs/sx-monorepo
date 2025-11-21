<script setup lang="ts">
import { useInfiniteQuery } from '@tanstack/vue-query';
import { AuctionNetworkId, formatPrice, getOrders } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _t, shortenAddress } from '@/helpers/utils';

const LIMIT = 20;

const props = defineProps<{
  network: AuctionNetworkId;
  auctionId: string;
  auction: AuctionDetailFragment;
}>();

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isFetchingNextPage,
  isError
} = useInfiniteQuery({
  initialPageParam: 0,
  queryKey: ['auction', props.network, props.auctionId, 'orders'],
  queryFn: ({ pageParam }) =>
    getOrders(props.auctionId, props.network, {
      first: LIMIT,
      skip: pageParam
    }),
  getNextPageParam: (lastPage, pages) => {
    if (lastPage.length < LIMIT) return null;

    return pages.length * LIMIT;
  }
});

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}
</script>

<template>
  <div>
    <UiSectionHeader label="Bids" sticky />
    <UiColumnHeader class="z-40 overflow-hidden gap-3">
      <div class="max-w-[218px] w-[218px] truncate">Bidder</div>
      <div class="grow w-[40%] truncate">Amount</div>
      <div class="max-w-[144px] w-[144px] truncate">Date</div>
      <div class="max-w-[144px] w-[144px] text-right truncate">Price</div>
    </UiColumnHeader>
    <UiLoading v-if="isPending" class="px-4 py-3 block" />
    <UiStateWarning v-else-if="isError" class="px-4 py-3">
      Failed to load bids.
    </UiStateWarning>
    <UiStateWarning v-if="data?.pages.flat().length === 0" class="px-4 py-3">
      There are no bids here.
    </UiStateWarning>
    <UiContainerInfiniteScroll
      v-if="data"
      :loading-more="isFetchingNextPage"
      @end-reached="handleEndReached"
    >
      <template #loading>
        <UiLoading class="px-4 py-3 block" />
      </template>
      <div
        class="divide-y divide-skin-border flex flex-col justify-center mx-4 border-b"
      >
        <div
          v-for="order in data?.pages.flat()"
          :key="order.id"
          class="flex justify-between items-center gap-3 py-3"
        >
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
          <div class="grow w-[40%] text-skin-link truncate">
            {{ _c(order.buyAmount, Number(auction.decimalsAuctioningToken)) }}
            {{ auction.symbolAuctioningToken }}
          </div>
          <div
            class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center truncate"
          >
            <TimeRelative
              v-slot="{ relativeTime }"
              :time="Number(order.timestamp)"
            >
              <h4>{{ relativeTime }}</h4>
            </TimeRelative>
            <div class="text-[17px]">
              {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
            </div>
          </div>
          <h4
            class="text-skin-link max-w-[144px] w-[144px] truncate text-right"
          >
            {{ formatPrice(order.price) }}
            {{ auction.symbolBiddingToken }}
          </h4>
        </div>
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
