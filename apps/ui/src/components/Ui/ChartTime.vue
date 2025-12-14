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

const SERIES_COLORS = {
  light: {
    lineColor: 'rgba(17, 17, 17, 0.8)',
    areaTopColor: 'rgba(17, 17, 17, 0.4)',
    areaBottomColor: 'rgba(17, 17, 17, 0.04)'
  },
  dark: {
    lineColor: 'rgba(251, 251, 251, 0.8)',
    areaTopColor: 'rgba(251, 251, 251, 0.4)',
    areaBottomColor: 'rgba(251, 251, 251, 0.04)'
  }
};

const CHART_COLORS = {
  light: {
    textColor: 'rgb(87, 96, 106)',
    gridLineColor: 'rgba(229, 229, 230, 0.7)',
    axisLineColor: 'rgb(229, 229, 230)',
    crosshairLabelBackgroundColor: 'rgb(17, 17, 17)',
    crosshairColor: 'rgb(229, 229, 230)'
  },
  dark: {
    textColor: 'rgb(160, 159, 164)',
    gridLineColor: 'rgba(47, 46, 51, 0.7)',
    axisLineColor: 'rgb(47, 46, 51)',
    crosshairLabelBackgroundColor: 'rgb(251, 251, 251)',
    crosshairColor: 'rgb(47, 46, 51)'
  }
};

const OPTIONS = {
  layout: {
    background: { color: 'transparent' },
    attributionLogo: false
  },
  grid: {
    vertLines: { color: 'transparent' },
    horzLines: {
      style: 1 // LineStyle.Dotted
    }
  },
  autoSize: true,
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
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    tickMarkMaxCharacterLength: 23,
    tickMarkFormatter: (time: number, tickMarkType: number) => {
      const date = new Date(time * 1000);

      if (tickMarkType === 1 || tickMarkType === 2) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC'
        });
      }

      return null;
    }
  },
  localization: {
    timeFormatter: (time: number) => {
      const date = new Date(time * 1000);

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      });
    }
  }
};

const props = defineProps<{
  series: ChartSeries[];
}>();

const chartContainer = ref<HTMLElement | null>(null);
const chart = shallowRef<IChartApi | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const seriesInstances = shallowRef<ISeriesApi<SeriesType, any>[]>([]);

const { currentTheme } = useTheme();

// Convert UTC timestamp to local timezone offset
// (effectively makes the chart interpret UTC timestamps as local time)
// see https://github.com/tradingview/lightweight-charts/blob/7104e9a4fb399f18db7a2868a91b3246014c4324/docs/time-zones.md
const timeToLocale = computed(() => {
  const timezoneOffset = new Date().getTimezoneOffset() * 60; // offset in seconds
  return (utcTimestamp: number) => utcTimestamp - timezoneOffset;
});

const localizedSeries = computed<ChartSeries[]>(() => {
  return props.series.map(seriesConfig => ({
    ...seriesConfig,
    data: seriesConfig.data.map(point => ({
      ...point,
      time: timeToLocale.value(point.time as number) as ChartDataPoint['time']
    }))
  }));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSeriesInstance(seriesConfig: ChartSeries): ISeriesApi<any, any> {
  if (!chart.value) throw new Error('Chart not initialized');

  if (seriesConfig.type === 'area') {
    return chart.value.addSeries(
      AreaSeries,
      seriesConfig.options as AreaSeriesPartialOptions
    );
  }

  return chart.value.addSeries(
    LineSeries,
    seriesConfig.options as LineSeriesPartialOptions
  );
}

function createSeries(series: ChartSeries[], options?: { reset: true }) {
  if (options?.reset) {
    seriesInstances.value.forEach(s => chart.value?.removeSeries(s));
  }

  seriesInstances.value = series.map(config => {
    const instance = createSeriesInstance(config);
    instance.setData(config.data);
    return instance;
  });
}

function updateSeries(series: ChartSeries[]) {
  series.forEach((config, index) => {
    seriesInstances.value[index]?.setData(config.data);
  });
}

function initChart() {
  if (!chartContainer.value) return;

  chart.value = createChart(chartContainer.value, OPTIONS);

  createSeries(localizedSeries.value);

  chart.value.timeScale().fitContent();
  updateChartTheme();
}

function recreateSeries() {
  if (!chart.value) return;

  createSeries(localizedSeries.value, { reset: true });

  chart.value?.timeScale().fitContent();
}

function updateChartTheme() {
  if (!chart.value) return;

  chart.value.applyOptions({
    layout: {
      textColor: CHART_COLORS[currentTheme.value].textColor
    },
    grid: {
      horzLines: {
        color: CHART_COLORS[currentTheme.value].gridLineColor
      }
    },
    timeScale: {
      borderColor: CHART_COLORS[currentTheme.value].axisLineColor
    },
    rightPriceScale: {
      borderColor: CHART_COLORS[currentTheme.value].axisLineColor
    },
    crosshair: {
      horzLine: {
        labelBackgroundColor:
          CHART_COLORS[currentTheme.value].crosshairLabelBackgroundColor,
        color: CHART_COLORS[currentTheme.value].crosshairColor
      },
      vertLine: {
        labelBackgroundColor:
          CHART_COLORS[currentTheme.value].crosshairLabelBackgroundColor,
        color: CHART_COLORS[currentTheme.value].crosshairColor
      }
    }
  });

  seriesInstances.value.forEach(instance => {
    instance.applyOptions({
      color: SERIES_COLORS[currentTheme.value].lineColor,
      lineColor: SERIES_COLORS[currentTheme.value].lineColor,
      topColor: SERIES_COLORS[currentTheme.value].areaTopColor,
      bottomColor: SERIES_COLORS[currentTheme.value].areaBottomColor
    });
  });
}

watch(currentTheme, updateChartTheme);

watch(
  localizedSeries,
  newSeries => {
    if (!chart.value) return;

    // Update existing series data or recreate if count changed
    if (newSeries.length !== seriesInstances.value.length) {
      recreateSeries();
    } else {
      // Update data for existing series
      updateSeries(newSeries);
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

useResizeObserver(chartContainer, () => {
  if (!chart.value) return;

  chart.value.timeScale().fitContent();
});
</script>

<template>
  <div ref="chartContainer" />
</template>
