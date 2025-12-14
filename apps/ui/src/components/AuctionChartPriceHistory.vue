<script lang="ts" setup>
import { ChartSeries } from '@/components/Ui/ChartTime.vue';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import {
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

const granularity = computed(() => {
  const auctionDuration =
    Number(props.auction.endTimeTimestamp) -
    Number(props.auction.startingTimeStamp);

  if ((offset.value && offset.value <= ONE_DAY) || auctionDuration <= ONE_DAY) {
    return 'minute';
  }

  return 'hour';
});

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
  return Math.max(
    offset.value ? chartEndTimestamp.value - offset.value : 0,
    roundTimestampToGranularity(
      Number(props.auction.startingTimeStamp),
      granularity.value
    )
  );
});

const granularityMinTimestamp = computed(() => {
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
      lineWidth: 2,
      priceFormat: {
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
        @click="offset = targetOffset"
        v-text="label"
      />
    </div>
  </div>
</template>
