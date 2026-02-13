<script lang="ts" setup>
import { formatUnits } from '@ethersproject/units';
import { SingleValueData, UTCTimestamp } from 'lightweight-charts';
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

const normalizedData = computed<SingleValueData[]>(() => {
  if (!data.value || hasNextPage.value) return [];

  const items = data.value.pages.flat();
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);

  const buckets = bucketPriceDepthData(items, clearingPrice).sort(
    (a, b) => b.priceStart - a.priceStart
  );
  let cumulativeBuyAmount = 0n;

  return buckets
    .map(bucket => {
      cumulativeBuyAmount += bucket.buyAmount;
      return {
        time: bucket.priceEnd as UTCTimestamp,
        value: Number(
          formatUnits(
            cumulativeBuyAmount,
            props.auction.decimalsAuctioningToken
          )
        ),
        customValues: {
          bucketBuyAmount: Number(
            formatUnits(bucket.buyAmount, props.auction.decimalsAuctioningToken)
          )
        }
      };
    })
    .sort((a, b) => a.time - b.time);
});
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="isPending || isError || hasNextPage || isFetchingNextPage"
      class="flex items-center justify-center flex-1"
    >
      <template v-if="isError">Failed to load chart.</template>
      <UiLoading v-else-if="isPending || hasNextPage || isFetchingNextPage" />
    </div>
    <UiChartPriceDepth
      v-else
      class="flex-1"
      :data="normalizedData"
      :auction="auction"
    />
  </div>
</template>
