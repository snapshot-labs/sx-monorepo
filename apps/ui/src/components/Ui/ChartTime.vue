<script lang="ts" setup>
import {
  AreaSeries,
  AreaSeriesPartialOptions,
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineSeriesPartialOptions,
  LineStyle,
  SeriesType,
  SingleValueData,
  TickMarkType
} from 'lightweight-charts';

export type ChartSeriesType = 'line' | 'area';

export type ChartSeries = {
  data: SingleValueData[];
  type?: ChartSeriesType;
  options?: LineSeriesPartialOptions | AreaSeriesPartialOptions;
};

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
    horzLines: { style: LineStyle.Dotted }
  },
  autoSize: true,
  rightPriceScale: { borderVisible: false },
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
    fixLeftEdge: true,
    fixRightEdge: true,
    tickMarkMaxCharacterLength: 23,
    tickMarkFormatter: (time: number, tickMarkType: number) => {
      const date = new Date(time * 1000);

      if (
        tickMarkType === TickMarkType.Month ||
        tickMarkType === TickMarkType.DayOfMonth
      ) {
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
const seriesInstances = shallowRef<ISeriesApi<SeriesType>[]>([]);

const { currentTheme } = useTheme();

// Convert UTC timestamp to local timezone offset
// (effectively makes the chart interpret UTC timestamps as local time)
// see https://github.com/tradingview/lightweight-charts/blob/7104e9a4fb399f18db7a2868a91b3246014c4324/docs/time-zones.md
// All further data manipulations should be done in UTC, to avoid double offsets
const timeToLocale = computed(() => {
  const timezoneOffset = new Date().getTimezoneOffset() * 60; // offset in seconds
  return (utcTimestamp: number) => utcTimestamp - timezoneOffset;
});

const localizedSeries = computed<ChartSeries[]>(() => {
  return props.series.map(config => ({
    ...config,
    data: config.data.map(point => ({
      ...point,
      time: timeToLocale.value(point.time as number) as SingleValueData['time']
    }))
  }));
});

function createSeries(series: ChartSeries[]) {
  if (!chart.value) return;

  seriesInstances.value = series.map(config => {
    return chart.value!.addSeries(
      config.type === 'area' ? AreaSeries : LineSeries,
      config.options
    );
  });
}

function updateSeriesData(series: ChartSeries[]) {
  if (!chart.value) return;

  series.forEach((config, index) => {
    seriesInstances.value[index]?.setData(config.data);
  });

  chart.value.timeScale().fitContent();
  updateChartColors();
}

function initChart() {
  if (!chartContainer.value) return;

  chart.value = createChart(chartContainer.value, OPTIONS);

  createSeries(localizedSeries.value);
  updateSeriesData(localizedSeries.value);
}

function updateChartColors() {
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

watch(currentTheme, updateChartColors);

watch(localizedSeries, newSeries => {
  if (!chart.value) return;

  // Assuming that series did not change, only its data
  // TODO: Support dynamic series addition/removal
  updateSeriesData(newSeries);
});

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
