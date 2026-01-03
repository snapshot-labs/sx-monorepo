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

const isFetchingPages = ref(false);

const { data, isError, isPending, fetchNextPage, hasNextPage } =
  useAuctionPriceLevelQuery({
    network: () => props.network,
    auction: () => props.auction
  });

watch(
  data,
  async () => {
    if (!isFetchingPages.value && hasNextPage.value && !isError.value) {
      isFetchingPages.value = true;

      while (hasNextPage.value && !isError.value) {
        await fetchNextPage();
      }

      isFetchingPages.value = false;
    }
  },
  { immediate: true }
);

const normalizedData = computed<SingleValueData[]>(() => {
  if (!data.value || hasNextPage.value) return [];

  const items = data.value.pages.flat();
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);

  const buckets = bucketPriceDepthData(items, clearingPrice).sort(
    (a, b) => b.priceStart - a.priceStart
  );
  let cumulativeVolume = 0;

  return buckets
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
