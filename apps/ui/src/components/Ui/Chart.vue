<script setup lang="ts">
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineStyle,
  Time
} from 'lightweight-charts';
import { _n } from '@/helpers/utils';
import chartData from './chart.json';

const chartContainer = ref<HTMLElement | null>(null);
const hoveredDataIndex = ref<number | null>(null);
const themeLinkColor = ref('rgb(17, 17, 17)');

let chart: IChartApi | null = null;
let seriesApis: Map<string, ISeriesApi<'Line'>> = new Map();
let greySeriesApis: Map<string, ISeriesApi<'Line'>> = new Map();
let updatePending = false;
let lastUpdateIndex = -1;

const toChartTime = (data: { time: number; value: number }[]) =>
  data.map(p => ({ time: (p.time / 1000) as Time, value: p.value }));

const dataSeries = computed(() =>
  chartData.series.map(config => ({
    ...config,
    data: chartData.data.map((point: any) => ({
      time: point.time,
      value: point[config.id] || 0
    }))
  }))
);

const currentDate = computed(() => {
  const idx = hoveredDataIndex.value ?? dataSeries.value[0].data.length - 1;
  const timestamp = dataSeries.value[0].data[idx].time;
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
});

const currentPercentages = computed(() => {
  const idx = hoveredDataIndex.value ?? dataSeries.value[0].data.length - 1;
  return dataSeries.value.map(series => ({
    ...series,
    percentage: series.data[idx].value,
    displayColor: series.id === 'price' ? themeLinkColor.value : series.color
  }));
});

function initializeChart() {
  if (!chartContainer.value) return;

  if (chart) {
    chart.remove();
    seriesApis.clear();
    greySeriesApis.clear();
  }

  const computedStyle = getComputedStyle(document.documentElement);
  const textColor = `rgb(${computedStyle.getPropertyValue('--text').trim()})`;
  const borderColor = `rgb(${computedStyle.getPropertyValue('--border').trim()})`;
  const linkColor = `rgb(${computedStyle.getPropertyValue('--link').trim()})`;

  themeLinkColor.value = linkColor;

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth || 600,
    height: chartContainer.value.clientHeight || 400,
    layout: { background: { color: 'transparent' }, textColor },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: borderColor, style: LineStyle.Dashed }
    },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.2, bottom: 0.2 },
      autoScale: true
    },
    leftPriceScale: { visible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true
    },
    crosshair: {
      mode: 1,
      vertLine: {
        color: borderColor,
        width: 1,
        style: LineStyle.Solid,
        labelVisible: false
      },
      horzLine: { visible: false, labelVisible: false }
    },
    handleScroll: false,
    handleScale: false,
    watermark: { visible: false }
  });

  dataSeries.value.forEach(series => {
    if (!chart) return;

    const isPrice = series.id === 'price';
    const color = isPrice ? linkColor : series.color;

    const coloredSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      lineStyle: isPrice ? LineStyle.Dashed : LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderWidth: 0,
      crosshairMarkerBackgroundColor: color
    });

    coloredSeries.setData(toChartTime(series.data));
    seriesApis.set(series.id, coloredSeries);

    const greySeries = chart.addSeries(LineSeries, {
      color: borderColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });

    greySeries.setData([]);
    greySeriesApis.set(series.id, greySeries);
  });

  chart.subscribeCrosshairMove(param => {
    if (!param.time) {
      hoveredDataIndex.value = null;
      lastUpdateIndex = -1;
      updatePending = false;
      dataSeries.value.forEach(series => {
        seriesApis.get(series.id)?.setData(toChartTime(series.data));
        greySeriesApis.get(series.id)?.setData([]);
      });
      return;
    }

    const timeInMs = (param.time as number) * 1000;
    const dataIndex = dataSeries.value[0].data.reduce(
      (closest, point, idx) =>
        Math.abs(point.time - timeInMs) <
        Math.abs(dataSeries.value[0].data[closest].time - timeInMs)
          ? idx
          : closest,
      0
    );

    if (dataIndex === lastUpdateIndex || updatePending) return;

    hoveredDataIndex.value = dataIndex;
    lastUpdateIndex = dataIndex;
    updatePending = true;

    requestAnimationFrame(() => {
      updatePending = false;
      dataSeries.value.forEach(series => {
        seriesApis
          .get(series.id)
          ?.setData(toChartTime(series.data.slice(0, dataIndex + 1)));
        greySeriesApis
          .get(series.id)
          ?.setData(toChartTime(series.data.slice(dataIndex)));
      });
    });
  });

  chart.timeScale().fitContent();
}

const { currentTheme } = useTheme();

// Watch for data or theme changes
watch([dataSeries, currentTheme], initializeChart);

onMounted(() => {
  initializeChart();

  // Handle resize
  if (chartContainer.value) {
    const resizeObserver = new ResizeObserver(() => {
      if (chart && chartContainer.value) {
        chart.applyOptions({
          width: chartContainer.value.clientWidth,
          height: chartContainer.value.clientHeight
        });
      }
    });

    resizeObserver.observe(chartContainer.value);

    onUnmounted(() => {
      resizeObserver.disconnect();
    });
  }
});

onUnmounted(() => {
  chart?.remove();
});
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <div class="flex items-center gap-2.5 px-1 py-3">
      <div
        v-for="series in currentPercentages"
        :key="series.id"
        class="flex items-center gap-1.5"
      >
        <div
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: series.displayColor }"
        />
        {{ series.label }}
        <b
          >${{
            _n(series.percentage, 'standard', { maximumFractionDigits: 2 })
          }}</b
        >
      </div>
    </div>
    <div ref="chartContainer" class="flex-1" />
    <div>{{ currentDate }}</div>
  </div>
</template>

<style scoped>
:deep(a[href*='tradingview']) {
  display: none !important;
}
</style>
