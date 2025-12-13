<script lang="ts" setup>
import { ChartSeries } from '@/components/Ui/ChartTime.vue';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import {
  ChartGranularity,
  normalizeTimeSeriesData,
  roundTimestampToGranularity
} from '@/helpers/charts';
import { useAuctionPriceDataQuery } from '@/queries/auction';

const TIME_OFFSET = {
  All: 0,
  '1H': 3600,
  '3H': 3600 * 3,
  '6H': 3600 * 6,
  '1D': 3600 * 24,
  '7D': 3600 * 24 * 7
};

const props = defineProps<{
  auction: AuctionDetailFragment;
  network: AuctionNetworkId;
}>();

const granularity = ref<ChartGranularity>('hour');
const offset = ref(0);

const chartEndTimestamp = computed(() => {
  return roundTimestampToGranularity(
    Math.min(
      Math.floor(Date.now() / 1000),
      Number(props.auction.endTimeTimestamp)
    ),
    granularity.value
  );
});

const chartStartTimestamp = computed(() => {
  if (offset.value === 0) {
    return roundTimestampToGranularity(
      Number(props.auction.startingTimeStamp),
      granularity.value
    );
  }

  return chartEndTimestamp.value - offset.value;
});

const granularityMinTimestamp = computed(() => {
  if (granularity.value === 'minute') {
    return chartEndTimestamp.value - 3600 * 24; // 24 hours
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
  start: granularityMinTimestamp,
  granularity
});

const normalizedData = computed(() => {
  const defaultData = [
    {
      startTimestamp: granularityMinTimestamp.value.toString(),
      close: props.auction.currentClearingPrice
    },
    {
      startTimestamp: chartEndTimestamp.value.toString(),
      close: props.auction.currentClearingPrice
    }
  ];

  const series = data.value?.pages?.flat() || [];

  return normalizeTimeSeriesData(
    series.length ? series : defaultData,
    granularity.value,
    granularityMinTimestamp.value,
    chartEndTimestamp.value
  );
});

const clampedData = computed(() => {
  return normalizedData.value.filter(
    point => point.time >= chartStartTimestamp.value
  );
});

const chartSeries = computed<ChartSeries[]>(() => [
  {
    data: clampedData.value,
    type: 'area',
    options: {
      lineType: 1,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001
      }
    }
  }
]);

function updateTimeRange(targetOffset: number) {
  offset.value = targetOffset;

  if (targetOffset === 0 || offset.value > 3600 * 24) {
    granularity.value = 'hour';
    return;
  }

  granularity.value = 'minute';
}

async function fetchAllPages() {
  while (hasNextPage.value && !isFetchingNextPage.value) {
    await fetchNextPage();
  }
}

onMounted(() => {
  fetchAllPages();
});

// Watch for data changes and fetch all pages
watch(data, () => {
  if (data.value && hasNextPage.value) {
    fetchAllPages();
  }
});
</script>

<template>
  <div>
    <div class="flex items-center justify-center min-h-[355px]">
      <UiLoading v-if="isPending" />
      <div v-else-if="isError" class="text-center space-y-2">
        Error loading chart
      </div>
      <UiChartTime
        v-else-if="!hasNextPage"
        class="h-[355px] w-full"
        :series="chartSeries"
      />
    </div>
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
        @click="updateTimeRange(targetOffset)"
        v-text="label"
      />
    </div>
  </div>
</template>
