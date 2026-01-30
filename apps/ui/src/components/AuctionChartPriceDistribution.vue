<script setup lang="ts">
import { UTCTimestamp } from 'lightweight-charts';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { bucketPriceDepthData } from '@/helpers/charts';
import { useAuctionPriceLevelQuery } from '@/queries/auction';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const {
  data,
  isError,
  isPending,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useAuctionPriceLevelQuery({
  network: () => props.network,
  auction: () => props.auction
});

watchEffect(async () => {
  if (
    hasNextPage.value &&
    !isError.value &&
    !isFetchingNextPage.value &&
    !isPending.value
  ) {
    await fetchNextPage();
  }
});

const normalizedData = computed<any[]>(() => {
  if (!data.value || hasNextPage.value) return [];

  const items = data.value.pages.flat();
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);

  const buckets = bucketPriceDepthData(items, clearingPrice, 20);

  return buckets.map(bucket => {
    return {
      startTime: bucket.priceStart as UTCTimestamp,
      endTime: bucket.priceEnd as UTCTimestamp,
      volume: bucket.volume
    };
  });
});

const maxVolume = computed(() => {
  return Math.max(...normalizedData.value.map(d => d.volume), 0);
});

const clearingPrice = computed(() => {
  return parseFloat(props.auction.currentClearingPrice);
});

const clearingPricePosition = computed(() => {
  if (normalizedData.value.length === 0) return 0;

  const minPrice = Math.min(
    ...normalizedData.value.map(d => d.startTime as number),
    clearingPrice.value
  );
  const maxPrice = Math.max(
    ...normalizedData.value.map(d => d.endTime as number),
    clearingPrice.value
  );

  if (maxPrice === minPrice) return 50;

  return ((clearingPrice.value - minPrice) / (maxPrice - minPrice)) * 100;
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex justify-between text-sm">
      <div>Bid distribution</div>
      <div class="flex gap-3">
        <div class="flex items-center gap-1">
          <div class="size-2 loser"></div>
          Lose
        </div>
        <div class="flex items-center gap-1">
          <div class="size-2 winner"></div>
          Win
        </div>
      </div>
    </div>
    <div v-if="isLoading" class="flex items-center justify-center h-[100px]">
      <UiLoading />
    </div>
    <div
      v-else
      class="flex flex-row items-end gap-[2px] w-full h-[100px] relative"
    >
      <UiTooltip
        v-for="dataPoint in normalizedData"
        :key="dataPoint.startTime"
        :title="`${dataPoint.startTime} - ${dataPoint.endTime}: ${dataPoint.volume} ${auction.symbolBiddingToken}`"
        :style="{
          height: `${Math.max((dataPoint.volume / maxVolume) * 100, 1)}%`
        }"
        class="w-full rounded-sm"
        :class="{
          winner: dataPoint.startTime >= clearingPrice,
          loser: dataPoint.startTime < clearingPrice
        }"
      >
      </UiTooltip>
      <div
        :style="{ left: `${clearingPricePosition}%` }"
        class="w-[1px] bg-skin-primary absolute top-0 bottom-0"
      />
    </div>
  </div>
</template>

<style scoped>
.winner {
  @apply bg-skin-text/50;
}
.loser {
  @apply bg-skin-text/20;
}
</style>
