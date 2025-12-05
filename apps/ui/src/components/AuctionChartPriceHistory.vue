<script lang="ts" setup>
import { ChartSeries } from '@/components/Ui/Chart.vue';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { ChartGranularity, normalizeTimeSeriesData } from '@/helpers/charts';
import { useAuctionPriceDataQuery } from '@/queries/auction';

// in seconds
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
  granularity
});

async function fetchAllPages() {
  while (hasNextPage.value && !isFetchingNextPage.value) {
    await fetchNextPage();
  }
}

onMounted(() => {
  fetchAllPages();
});

const allData = computed(() => {
  if (!data.value) return [];
  return data.value.pages.flat();
});

const normalizedData = computed(() => {
  const end = Math.min(
    Math.floor(Date.now() / 1000),
    Number(props.auction.endTimeTimestamp)
  );
  const start = offset.value
    ? end - offset.value
    : Number(props.auction.startingTimeStamp);
  return normalizeTimeSeriesData(allData.value, granularity.value, start, end);
});

const chartSeries = computed<ChartSeries[]>(() => [
  {
    data: normalizedData.value,
    type: 'area',
    options: {
      lineType: 1, // step
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
</script>

<template>
  <div>
    <div class="flex items-center justify-center min-h-[355px]">
      <UiLoading v-if="isPending" />
      <div v-else-if="isError" class="text-center space-y-2">
        Error loading chart
      </div>
      <UiChart
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
