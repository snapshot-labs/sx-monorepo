<script lang="ts" setup>
import {
  AreaSeriesPartialOptions,
  BarPrice,
  LineType,
  SingleValueData,
  Time
} from 'lightweight-charts';
import { CHART_DEFAULT_OPTIONS, ChartSeries } from '@/composables/useChart';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { getPriceFormat } from '@/helpers/charts';
import { _n } from '@/helpers/utils';

const BELOW_CLEARING_PRICE_SERIES_OPTIONS: AreaSeriesPartialOptions = {
  lineColor: 'rgba(239, 68, 68, 0.8)', // red-500
  topColor: 'rgba(239, 68, 68, 0.4)',
  bottomColor: 'rgba(239, 68, 68, 0.04)',
  lineWidth: 2,
  lineType: LineType.WithSteps,
  lastValueVisible: false,
  priceLineVisible: false
};

const ABOVE_CLEARING_PRICE_SERIES_OPTIONS: AreaSeriesPartialOptions = {
  lineColor: 'rgba(34, 197, 94, 0.8)', // green-500
  topColor: 'rgba(34, 197, 94, 0.4)',
  bottomColor: 'rgba(34, 197, 94, 0.04)',
  lineWidth: 2,
  lineType: LineType.WithSteps,
  lastValueVisible: false,
  priceLineVisible: false
};

const props = defineProps<{
  data: SingleValueData[];
  auction: AuctionDetailFragment;
}>();

const clearingPrice = computed(() => {
  return parseFloat(props.auction.currentClearingPrice);
});

const partitionedData = computed(() => {
  const below: SingleValueData[] = [];
  const above: SingleValueData[] = [];
  const clearing = clearingPrice.value;

  for (const item of props.data) {
    const time = item.time as number;
    if (time <= clearing) {
      below.push(item);
    }
    if (time >= clearing) {
      above.push(item);
    }
  }

  // lightweight-charts is showing single point series as a line around the point,
  // overlapping with other series. To avoid that, we add a dummy point before/after
  if (below.length === 1) {
    below.unshift({
      value: below[0].value,
      time: 0 as Time
    });
  }

  if (above.length === 1) {
    above.push({
      value: above[0].value,
      time: ((above[0].time as number) * 1.1) as Time
    });
  }

  return { below, above };
});

const series = computed<ChartSeries[]>(() => {
  return [
    {
      type: 'area',
      options: BELOW_CLEARING_PRICE_SERIES_OPTIONS,
      data: partitionedData.value.below
    },
    {
      type: 'area',
      options: ABOVE_CLEARING_PRICE_SERIES_OPTIONS,
      data: partitionedData.value.above
    }
  ];
});

const priceDelta = computed<number>(() => {
  if (props.data.length === 0) return 0;

  const allPrices = props.data.map(item => item.time as number);

  return Math.max(...allPrices) - Math.min(...allPrices);
});

const { chartContainer, chart } = useChart({
  series,
  chartOptions: {
    crosshair: {
      horzLine: { visible: false, labelVisible: false },
      vertLine: { labelVisible: false }
    },
    localization: {
      ...CHART_DEFAULT_OPTIONS.localization,
      // Format the x-axis time as price
      timeFormatter: (time: number) => formatNumber(time, priceDelta.value)
    },
    timeScale: {
      ...CHART_DEFAULT_OPTIONS.timeScale,
      tickMarkFormatter: (time: number) =>
        // Format the x-axis time as price
        formatNumber(time, priceDelta.value)
    }
  }
});

function formatNumber(value: number, range?: number): string {
  const r = Number(range);
  const safeRange = Number.isFinite(r) ? r : value;
  return getPriceFormat(safeRange).formatter(value as BarPrice);
}
</script>

<template>
  <div ref="chartContainer" class="relative">
    <UiChartTooltip
      v-if="chart"
      v-slot="{ time, value, customValues }"
      :chart="chart"
    >
      <div class="text-[32px] leading-9">
        {{ formatNumber(time as number, priceDelta) }}
        <span class="text-md" v-text="props.auction.symbolBiddingToken" />
      </div>
      <div class="text-sm text-skin-text">
        Cumulative demand:
        <span class="text-skin-link">
          {{ formatNumber(value) }} {{ props.auction.symbolBiddingToken }}
        </span>
      </div>
      <div v-if="customValues?.bucketVolume" class="text-xs text-skin-text">
        Bid volume @ this level:
        <span class="text-skin-link">
          {{ formatNumber(customValues.bucketVolume as number) }}
          {{ props.auction.symbolBiddingToken }}
        </span>
      </div>
    </UiChartTooltip>

    <UiChartVerticalLine v-if="chart" :chart="chart" :value="clearingPrice">
      Clearing:
      {{
        _n(clearingPrice, 'standard', {
          maximumFractionDigits: 6
        })
      }}
      {{ props.auction.symbolBiddingToken }}
    </UiChartVerticalLine>
  </div>
</template>
