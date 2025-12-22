<script lang="ts" setup>
import { SingleValueData, UTCTimestamp } from 'lightweight-charts';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { bucketPriceDepthData } from '@/helpers/charts';
import { useAuctionPriceLevelQuery } from '@/queries/auction';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const { data, isError, isPending, fetchNextPage, hasNextPage } =
  useAuctionPriceLevelQuery({
    network: () => props.network,
    auction: () => props.auction
  });

const isFetchingPages = ref(false);

// Watch for initial data load, then fetch remaining pages
watchEffect(async () => {
  // Wait for initial data and avoid duplicate fetches
  if (
    data.value &&
    hasNextPage.value &&
    !isError.value &&
    !isFetchingPages.value
  ) {
    isFetchingPages.value = true;

    while (hasNextPage.value && !isError.value) {
      await fetchNextPage();
    }

    isFetchingPages.value = false;
  }
});

// Reset fetching state when props change
watch([() => props.network, () => props.auction], () => {
  isFetchingPages.value = false;
});

const normalizedData = computed<SingleValueData[]>(() => {
  if (!data.value || hasNextPage.value) return [];

  const items = data.value.pages.flat();
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);

  // Check if clearing price is within the data range
  const prices = items.map(item => parseFloat(item.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  let adjustedItems = items;

  // If clearing price is out of bounds, add it to the series
  if (clearingPrice < minPrice || clearingPrice > maxPrice) {
    adjustedItems = [
      ...items,
      {
        price: clearingPrice.toString(),
        volume: '0' // Zero volume for the clearing price point
      }
    ];
  }

  const buckets = bucketPriceDepthData(adjustedItems, 100, clearingPrice);
  const sortedDesc = [...buckets].sort((a, b) => b.priceStart - a.priceStart);
  let cumulativeVolume = 0;

  return sortedDesc
    .map(bucket => {
      cumulativeVolume += bucket.volume;
      return {
        time: bucket.priceEnd as UTCTimestamp,
        value: cumulativeVolume,
        customValues: {
          bucketVolume: bucket.volume
        }
      };
    })
    .sort((a, b) => a.time - b.time);
});
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="isPending || isError || hasNextPage"
      class="flex items-center justify-center flex-1"
    >
      <template v-if="isError">Error while loading chart</template>
      <UiLoading v-else-if="isPending || hasNextPage" />
    </div>
    <UiChartPriceDepth
      v-else
      class="flex-1"
      :data="normalizedData"
      :auction="auction"
    />
  </div>
</template>
