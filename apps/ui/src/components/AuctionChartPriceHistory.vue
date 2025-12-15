<script lang="ts" setup>
import { LineType, SingleValueData } from 'lightweight-charts';
import { ChartSeries } from '@/components/Ui/ChartTime.vue';
import { AuctionNetworkId, AuctionPriceHistoryData } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import {
  ChartGranularity,
  normalizeTimeSeriesData,
  roundTimestampToGranularity
} from '@/helpers/charts';
import { useAuctionPriceDataQuery } from '@/queries/auction';

const ONE_HOUR = 3600;
const ONE_DAY = ONE_HOUR * 24;

const TIME_OFFSET = {
  All: null,
  '1H': ONE_HOUR,
  '3H': ONE_HOUR * 3,
  '6H': ONE_HOUR * 6,
  '1D': ONE_DAY,
  '7D': ONE_DAY * 7
};

const props = defineProps<{
  auction: AuctionDetailFragment;
  network: AuctionNetworkId;
}>();

const offset = ref<number | null>(null);

const granularity = computed<ChartGranularity>(() => {
  const auctionDuration =
    Number(props.auction.endTimeTimestamp) -
    Number(props.auction.startingTimeStamp);

  if ((offset.value && offset.value <= ONE_DAY) || auctionDuration <= ONE_DAY) {
    return 'minute';
  }

  return 'hour';
});

const chartEndTimestamp = computed<number>(() => {
  return roundTimestampToGranularity(
    Math.min(
      Math.floor(Date.now() / 1000),
      Number(props.auction.endTimeTimestamp)
    ),
    granularity.value
  );
});

const chartStartTimestamp = computed<number>(() => {
  return Math.max(
    offset.value ? chartEndTimestamp.value - offset.value : 0,
    roundTimestampToGranularity(
      Number(props.auction.startingTimeStamp),
      granularity.value
    )
  );
});

// Dataset min timestamp based on granularity
const granularityMinDataTimestamp = computed<number>(() => {
  if (granularity.value === 'minute') {
    return chartEndTimestamp.value - ONE_DAY;
  }

  return roundTimestampToGranularity(
    Number(props.auction.startingTimeStamp),
    granularity.value
  );
});

const {
  data,
  isPending,
  isError,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useAuctionPriceDataQuery({
  network: () => props.network,
  auction: () => props.auction,
  start: granularityMinDataTimestamp,
  granularity
});

const normalizedData = computed<SingleValueData[]>(() => {
  if (!data.value || hasNextPage.value) return [];

  const defaultData: AuctionPriceHistoryData[] = [
    {
      startTimestamp: granularityMinDataTimestamp.value.toString(),
      close: props.auction.currentClearingPrice
    },
    {
      startTimestamp: chartEndTimestamp.value.toString(),
      close: props.auction.currentClearingPrice
    }
  ];

  const series = data.value.pages.flat() || [];

  return normalizeTimeSeriesData(
    series.length ? series : defaultData,
    granularity.value,
    granularityMinDataTimestamp.value,
    chartEndTimestamp.value
  );
});

const clampedData = computed<SingleValueData[]>(() => {
  return normalizedData.value.filter(
    point => (point.time as number) >= chartStartTimestamp.value
  );
});

const chartSeries = computed<ChartSeries[]>(() => [
  {
    data: clampedData.value,
    type: 'area',
    options: {
      lineType: LineType.WithSteps,
      lineWidth: 2,
      priceFormat: {
        // TODO: better dynamic precision based on price range
        precision: 4
      }
    }
  }
]);

async function fetchAllPages() {
  while (hasNextPage.value && !isFetchingNextPage.value) {
    await fetchNextPage();
  }
}

onMounted(() => {
  fetchAllPages();
});

watch(data, () => {
  if (hasNextPage.value) {
    fetchAllPages();
  }
});
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="isPending || isError"
      class="flex items-center justify-center flex-1"
    >
      <UiLoading v-if="isPending" />
      <template v-else-if="isError">Error while loading chart</template>
    </div>
    <UiChartTime
      v-else-if="!hasNextPage"
      class="flex-1"
      :series="chartSeries"
    />
    <div class="space-x-2">
      <button
        v-for="(targetOffset, label) in TIME_OFFSET"
        :key="label"
        :disabled="isPending || isFetchingNextPage"
        type="button"
        class="rounded-full text-skin-link text-sm px-2 text-center inline-block"
        :class="{
          'text-white bg-skin-text': offset === targetOffset,
          'opacity-50 cursor-not-allowed': isPending || isFetchingNextPage
        }"
        @click="offset = targetOffset"
        v-text="label"
      />
    </div>
  </div>
</template>
