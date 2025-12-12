<script lang="ts" setup>
import {
  AreaSeries,
  AreaSeriesPartialOptions,
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineSeriesPartialOptions,
  SeriesType
} from 'lightweight-charts';
import { ChartDataPoint } from '@/helpers/charts';

export type ChartSeriesType = 'line' | 'area';

export interface ChartSeries {
  data: ChartDataPoint[];
  type?: ChartSeriesType;
  options?: LineSeriesPartialOptions | AreaSeriesPartialOptions;
}

const props = defineProps<{
  series: ChartSeries[];
}>();

const chartContainer = ref<HTMLElement | null>(null);
const chart = shallowRef<IChartApi | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const seriesInstances = shallowRef<ISeriesApi<SeriesType, any>[]>([]);

const CHART_COLORS = {
  lineColor: 'rgba(59, 130, 246, 0.8)',
  topColor: 'rgba(59, 130, 246, 0.4)',
  bottomColor: 'rgba(59, 130, 246, 0.04)'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSeriesInstance(seriesConfig: ChartSeries): ISeriesApi<any, any> {
  if (!chart.value) throw new Error('Chart not initialized');

  // Merge default colors with user options
  const defaultOptions =
    seriesConfig.type === 'area'
      ? {
          topColor: CHART_COLORS.topColor,
          bottomColor: CHART_COLORS.bottomColor,
          lineColor: CHART_COLORS.lineColor,
          lineWidth: 2,
          ...seriesConfig.options
        }
      : {
          color: CHART_COLORS.lineColor,
          lineWidth: 2,
          ...seriesConfig.options
        };

  if (seriesConfig.type === 'area') {
    return chart.value.addSeries(
      AreaSeries,
      defaultOptions as AreaSeriesPartialOptions
    );
  }

  return chart.value.addSeries(
    LineSeries,
    defaultOptions as LineSeriesPartialOptions
  );
}

function initChart() {
  if (!chartContainer.value) return;

  chart.value = createChart(chartContainer.value, {
    layout: {
      background: { color: 'transparent' },
      textColor: '#9ca3af',
      attributionLogo: false
    },
    grid: {
      vertLines: { color: 'transparent' },
      horzLines: { color: 'rgba(156, 163, 175, 0.1)' }
    },
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight,
    rightPriceScale: {
      borderVisible: false
    },
    handleScroll: {
      vertTouchDrag: false,
      mouseWheel: false,
      pressedMouseMove: false
    },
    handleScale: {
      axisPressedMouseMove: {
        price: false,
        time: false
      },
      mouseWheel: false,
      pinch: false
    },
    crosshair: {
      horzLine: { visible: true },
      vertLine: { visible: true }
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false
    }
  });

  // Create all series
  seriesInstances.value = props.series.map(seriesConfig => {
    const instance = createSeriesInstance(seriesConfig);
    if (seriesConfig.data.length > 0) {
      instance.setData(seriesConfig.data);
    }
    return instance;
  });

  chart.value.timeScale().fitContent();
}

function recreateSeries() {
  if (!chart.value) return;

  // Remove old series and recreate
  seriesInstances.value.forEach(s => chart.value?.removeSeries(s));
  seriesInstances.value = props.series.map(seriesConfig => {
    const instance = createSeriesInstance(seriesConfig);
    if (seriesConfig.data.length > 0) {
      instance.setData(seriesConfig.data);
    }
    return instance;
  });

  chart.value?.timeScale().fitContent();
}

watch(
  () => props.series,
  newSeries => {
    if (!chart.value) return;

    // Update existing series data or recreate if count changed
    if (newSeries.length !== seriesInstances.value.length) {
      recreateSeries();
    } else {
      // Update data for existing series
      newSeries.forEach((seriesConfig, index) => {
        const instance = seriesInstances.value[index];
        if (instance && seriesConfig.data.length > 0) {
          instance.setData(seriesConfig.data);
        }
      });
      chart.value?.timeScale().fitContent();
    }
  },
  { deep: true }
);

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  chart.value?.remove();
});

useResizeObserver(chartContainer, entries => {
  const entry = entries[0];
  if (entry && chart.value) {
    chart.value.applyOptions({ width: entry.contentRect.width });
  }
});
</script>

<template>
  <div ref="chartContainer" />
</template>
