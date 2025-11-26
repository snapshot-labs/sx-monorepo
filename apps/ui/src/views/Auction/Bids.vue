<script setup lang="ts">
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { useBiddingTokenPriceQuery, useBidsQuery } from '@/queries/auction';

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
} = useBidsQuery({
  network: () => props.network,
  auction: () => props.auction
});

const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useBiddingTokenPriceQuery({
    network: () => props.network,
    auction: () => props.auction
  });

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}
</script>

<template>
  <div>
    <UiSectionHeader label="Bids" sticky />
    <UiColumnHeader class="z-40 overflow-hidden gap-3">
      <div class="flex-1 min-w-[168px] truncate">Bidder</div>
      <div class="max-w-[168px] w-[168px] truncate">Date</div>
      <div class="max-w-[168px] w-[168px] truncate">Amount</div>
      <div class="max-w-[168px] w-[168px] text-right truncate">Price</div>
    </UiColumnHeader>
    <UiLoading
      v-if="isPending || isBiddingTokenPriceLoading"
      class="px-4 py-3 block"
    />
    <UiStateWarning v-else-if="isError" class="px-4 py-3">
      Failed to load bids.
    </UiStateWarning>
    <UiStateWarning
      v-else-if="data?.pages.flat().length === 0"
      class="px-4 py-3"
    >
      There are no bids here.
    </UiStateWarning>
    <UiContainerInfiniteScroll
      v-else-if="data && typeof biddingTokenPrice === 'number'"
      :loading-more="isFetchingNextPage"
      @end-reached="handleEndReached"
    >
      <template #loading>
        <UiLoading class="px-4 py-3 block" />
      </template>
      <div
        class="divide-y divide-skin-border flex flex-col justify-center border-b"
      >
        <AuctionBid
          v-for="order in data?.pages.flat()"
          :key="order.id"
          :auction-id="auctionId"
          :auction="auction"
          :order="order"
          :bidding-token-price="biddingTokenPrice"
        />
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
