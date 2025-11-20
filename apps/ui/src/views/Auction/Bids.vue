<script setup lang="ts">
import { useInfiniteQuery } from '@tanstack/vue-query';
import { AuctionNetworkId, formatPrice, getOrders } from '@/helpers/auction';
import {
  AuctionDetailFragment,
  OrderDetailFragment
} from '@/helpers/auction/gql/graphql';
import { _n, _t, shortenAddress } from '@/helpers/utils';

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

function getAmount(order: OrderDetailFragment) {
  const auctionedTokenAmount = Number(order.volume) / Number(order.price);

  return _n(auctionedTokenAmount);
}

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}
</script>

<template>
  <div>
    <UiSectionHeader label="Bids" sticky />
    <UiColumnHeader class="!px-3 z-40 overflow-hidden gap-3">
      <div class="max-w-[218px] w-[218px] truncate">Bidder</div>
      <div class="grow w-[40%]">Amount</div>
      <div
        class="flex max-w-[144px] w-[144px] items-center hover:text-skin-link truncate"
      >
        Date
      </div>
      <div
        class="max-w-[144px] w-[144px] flex items-center justify-end hover:text-skin-link truncate"
      >
        Price
      </div>
    </UiColumnHeader>
    <UiContainerInfiniteScroll
      v-if="data"
      :loading-more="isFetchingNextPage"
      @end-reached="handleEndReached"
    >
      <template #loading>
        <UiLoading class="px-4 py-3 block" />
      </template>
      <div
        class="divide-y divide-skin-border flex flex-col justify-center border-b"
      >
        <UiLoading v-if="isPending" class="px-4 py-3 block" />
        <UiStateWarning v-if="isError" class="px-4 py-3">
          Failed to load votes.
        </UiStateWarning>
        <UiStateWarning
          v-if="data?.pages.flat().length === 0"
          class="px-4 py-3"
        >
          There are no bids here.
        </UiStateWarning>
        <div
          v-for="order in data?.pages.flat()"
          v-else
          :key="order.id"
          class="flex justify-between items-center gap-3 p-3"
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
          <div
            type="button"
            class="grow w-[40%] flex flex-col items-start justify-center truncate leading-[22px] text-skin-link"
          >
            {{ getAmount(order) }} {{ auction.symbolAuctioningToken }}
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
          <div
            class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center text-right truncate"
          >
            <h4 class="text-skin-link truncate">
              {{ formatPrice(order.price) }}
              {{ auction.symbolBiddingToken }}
            </h4>
          </div>
          <div v-if="false">
            Wants to buy at
            <span class="text-skin-link"
              >{{ formatPrice(order.price) }}
              {{ auction.symbolBiddingToken }}</span
            >
            with
            <span class="text-skin-link"
              >{{ order.volume }} {{ auction.symbolBiddingToken }}</span
            >
          </div>
        </div>
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
