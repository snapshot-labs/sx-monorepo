<script lang="ts" setup>
import { formatUnits } from '@ethersproject/units';
import {
  AreaSeriesPartialOptions,
  BarPrice,
  LineSeriesPartialOptions,
  LineStyle,
  LineType,
  SingleValueData
} from 'lightweight-charts';
import { CHART_DEFAULT_OPTIONS, ChartSeries } from '@/composables/useChart';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { getPriceFormat } from '@/helpers/charts';

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

const SUPPLY_CAP_LINE_SERIES_OPTIONS: LineSeriesPartialOptions = {
  color: '#3b82f6',
  lineWidth: 1,
  lineStyle: LineStyle.Dashed,
  lastValueVisible: false,
  priceLineVisible: true,
  title: 'Supply cap',
  crosshairMarkerVisible: false
};

const CLEARING_PRICE_COLOR = '#f59e0b';

const props = defineProps<{
  data: SingleValueData[];
  auction: AuctionDetailFragment;
}>();

const clearingPrice = computed(() => {
  return parseFloat(props.auction.currentClearingPrice);
});

const series = computed<ChartSeries[]>(() => {
  const supplyCap = parseFloat(
    formatUnits(
      props.auction.exactOrder.sellAmount,
      props.auction.decimalsAuctioningToken
    )
  );

  return [
    {
      type: 'area',
      options: BELOW_CLEARING_PRICE_SERIES_OPTIONS,
      data: props.data.filter(
        item => (item.time as number) <= clearingPrice.value
      )
    },
    {
      type: 'area',
      options: ABOVE_CLEARING_PRICE_SERIES_OPTIONS,
      data: props.data.filter(
        item => (item.time as number) >= clearingPrice.value
      )
    },
    {
      type: 'line',
      options: SUPPLY_CAP_LINE_SERIES_OPTIONS,
      data: props.data.map(datum => ({
        time: datum.time,
        value: supplyCap
      }))
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
          {{ formatNumber(value) }} {{ props.auction.symbolAuctioningToken }}
        </span>
      </div>
      <div v-if="customValues?.bucketVolume" class="text-xs text-skin-text">
        Bid volume @ this level:
        <span class="text-skin-link">
          {{ formatNumber(customValues.bucketVolume as number) }}
          {{ props.auction.symbolAuctioningToken }}
        </span>
      </div>
    </UiChartTooltip>

    <UiChartVerticalLine
      v-if="chart"
      :chart="chart"
      :value="clearingPrice"
      :color="CLEARING_PRICE_COLOR"
    >
      Clearing: {{ formatNumber(clearingPrice) }}
      {{ props.auction.symbolBiddingToken }}
    </UiChartVerticalLine>
  </div>
</template>
