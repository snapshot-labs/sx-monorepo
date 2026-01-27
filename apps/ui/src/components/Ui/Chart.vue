<script setup lang="ts">
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineStyle,
  Time
} from 'lightweight-charts';
import { CandleDataPoint } from '@/composables/useFutarchy';
import { _n } from '@/helpers/utils';

// Currency info for toggle (from useFutarchy)
interface CurrencyInfo {
  rate: number | null;
  tokenSymbol: string;
  stableSymbol: string | null;
}

const props = withDefaults(defineProps<{
  candleData: CandleDataPoint[];
  priceScaleFactor: number;
  startTimestamp: number;
  maxTimestamp: number;
  pricePrecision?: number;
  currencyInfo?: CurrencyInfo | null;  // For currency toggle
}>(), {
  pricePrecision: 6,
  currencyInfo: null
});

// Emit for toggle state so parent can update volume
const emit = defineEmits<{
  (e: 'rateToggle', useStable: boolean, rate: number): void
}>();

// Toggle state: true = use stable rate (xDAI), false = raw (sDAI)
const useStableRate = ref(true);

// Computed: effective rate to apply based on toggle
const effectiveRate = computed(() => {
  if (!props.currencyInfo?.rate || !props.currencyInfo?.stableSymbol) return 1;
  return useStableRate.value ? props.currencyInfo.rate : 1;
});

// Computed: current currency symbol based on toggle
const currentSymbol = computed(() => {
  if (!props.currencyInfo) return '';
  if (!props.currencyInfo.stableSymbol) return props.currencyInfo.tokenSymbol;
  return useStableRate.value ? props.currencyInfo.stableSymbol : props.currencyInfo.tokenSymbol;
});

// Check if toggle should be shown (only if both symbols available)
const showCurrencyToggle = computed(() => {
  console.log('[Chart] currencyInfo:', props.currencyInfo);
  return props.currencyInfo?.rate && props.currencyInfo?.stableSymbol;
});

const chartContainer = ref<HTMLElement | null>(null);
const hoveredDataIndex = ref<number | null>(null);
const showDefaultMarkers = ref(true);
const markerPositions = ref<
  { id: string; color: string; x: number; y: number }[]
>([]);

let chart: IChartApi | null = null;
let seriesApis = new Map<string, ISeriesApi<'Line'>>();
let greySeriesApis = new Map<string, ISeriesApi<'Line'>>();
let updatePending = false;
let lastUpdateIndex = -1;
let updateMarkerPositionsFn: (() => void) | null = null;

const seriesConfig = [
  { id: 'yes', label: 'Yes', color: '#22c55e' },
  { id: 'no', label: 'No', color: '#ef4444' },
  { id: 'spot', label: 'Spot', color: '#f59e0b' }  // Amber/orange for spot
];

const toChartTime = (data: { time: number; value: number }[]) =>
  data.map(p => ({
    time: p.time as Time,  // time is already in seconds from dataSeries
    value: p.value * props.priceScaleFactor
  }));

const dataSeries = computed(() =>
  seriesConfig
    .map(config => ({
      ...config,
      data: props.candleData.map(point => {
        const rawValue = point[config.id as keyof CandleDataPoint] as number;
        // Apply rate to all series (yes, no, and spot)
        const displayValue = rawValue * effectiveRate.value;
        return {
          time: (point.time / 1000) as Time,  // Convert ms to seconds for chart library
          value: displayValue
        };
      })
    }))
    // Filter out series with no data (e.g., spot when not available)
    .filter(series => series.data.some(d => d.value > 0))
);

type TimeFormatMode = 'time' | 'day' | 'month';

function getTimeFormatMode(dataPoints: { time: number }[]): TimeFormatMode {
  if (dataPoints.length < 2) return 'day';
  const rangeMs = dataPoints[dataPoints.length - 1].time - dataPoints[0].time;
  const ONE_DAY = 86400000;
  if (rangeMs <= ONE_DAY) return 'time';
  if (rangeMs <= ONE_DAY * 60) return 'day';
  return 'month';
}

function formatTimeLabel(timestamp: number, mode: TimeFormatMode): string {
  const date = new Date(timestamp * 1000);
  const options: Intl.DateTimeFormatOptions =
    mode === 'time'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : mode === 'day'
        ? { month: 'short', day: 'numeric' }
        : { month: 'short' };
  const formatted = date.toLocaleString('en-US', options);
  return mode === 'time' ? formatted.toLowerCase() : formatted;
}

const currentDate = computed(() => {
  if (props.candleData.length === 0) return '';
  const idx = hoveredDataIndex.value ?? props.candleData.length - 1;
  const timestamp = props.candleData[idx]?.time;
  if (!timestamp) return '';
  // Show hour only (no minutes) for hourly candles
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    hour12: true
  });
});

const currentValues = computed(() => {
  if (props.candleData.length === 0) return [];
  const idx = hoveredDataIndex.value ?? props.candleData.length - 1;
  const point = props.candleData[idx];
  if (!point) return [];
  return seriesConfig
    .map(s => {
      const rawValue = point[s.id as keyof CandleDataPoint] as number;
      // Apply rate to all series (yes, no, and spot)
      const displayValue = rawValue * effectiveRate.value;
      return {
        ...s,
        value: displayValue
      };
    })
    // Hide legend entries for series with 0 value (e.g., Spot when not available)
    .filter(s => s.value > 0);
});

function initializeChart() {
  if (!chartContainer.value || props.candleData.length === 0) return;

  if (chart) {
    chart.remove();
    seriesApis.clear();
    greySeriesApis.clear();
  }

  const styles = getComputedStyle(document.documentElement);
  const textColor = `rgb(${styles.getPropertyValue('--text').trim()})`;
  const borderValue = styles.getPropertyValue('--border').trim();
  const borderColor = borderValue ? `rgb(${borderValue})` : 'rgba(0,0,0,0.1)';
  const fontFamily = getComputedStyle(document.body).fontFamily;
  const timeFormatMode = getTimeFormatMode(props.candleData);

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth || 600,
    height: chartContainer.value.clientHeight || 400,
    layout: {
      background: { color: 'transparent' },
      textColor,
      fontFamily,
      fontSize: 14
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { visible: true, color: borderColor, style: LineStyle.Dashed }
    },
    rightPriceScale: {
      visible: true,
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      autoScale: true,
      alignLabels: true
    },
    localization: {
      priceFormatter: (price: number) => {
        const p = price / props.priceScaleFactor;
        if (p === 0) return '0';
        if (Math.abs(p) < 0.0001) return p.toPrecision(4);
        if (Math.abs(p) < 0.01) return p.toFixed(6);
        if (Math.abs(p) < 1) return p.toFixed(4);
        if (Math.abs(p) < 100) return p.toFixed(2);
        return p.toFixed(0);
      }
    },
    leftPriceScale: { visible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: false,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
      rightOffset: 5,
      tickMarkFormatter: (time: Time) =>
        formatTimeLabel(time as number, timeFormatMode)
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
    handleScale: false
  });

  dataSeries.value.forEach(series => {
    if (!chart) return;

    const coloredSeries = chart.addSeries(LineSeries, {
      color: series.color,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderWidth: 0,
      crosshairMarkerBackgroundColor: series.color,
      priceScaleId: 'right'
    });
    coloredSeries.setData(toChartTime(series.data));
    seriesApis.set(series.id, coloredSeries);

    const greySeries = chart.addSeries(LineSeries, {
      color: borderColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceScaleId: 'right'
    });
    greySeries.setData([]);
    greySeriesApis.set(series.id, greySeries);
  });

  let isUpdatingData = false;  // Guard to prevent infinite loop when setData triggers crosshair move
  
  chart.subscribeCrosshairMove(param => {
    if (isUpdatingData) return;  // Skip if we're in the middle of updating data
    
    if (!param.time) {
      hoveredDataIndex.value = null;
      lastUpdateIndex = -1;
      updatePending = false;
      
      isUpdatingData = true;
      dataSeries.value.forEach(s => {
        seriesApis.get(s.id)?.setData(toChartTime(s.data));
        greySeriesApis.get(s.id)?.setData([]);
      });
      isUpdatingData = false;
      
      showDefaultMarkers.value = true;
      requestAnimationFrame(() => updateMarkerPositionsFn?.());
      return;
    }

    showDefaultMarkers.value = false;
    const timeInMs = (param.time as number) * 1000;
    const dataIndex = props.candleData.reduce(
      (closest, point, idx) =>
        Math.abs(point.time - timeInMs) <
        Math.abs(props.candleData[closest].time - timeInMs)
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
      isUpdatingData = true;
      dataSeries.value.forEach(s => {
        seriesApis
          .get(s.id)
          ?.setData(toChartTime(s.data.slice(0, dataIndex + 1)));
        greySeriesApis.get(s.id)?.setData(toChartTime(s.data.slice(dataIndex)));
      });
      isUpdatingData = false;
    });
  });

  if (props.candleData.length > 0) {
    // Use actual candle data range (candle trading may start after proposal voting period)
    const firstCandleTime = props.candleData[0].time / 1000;  // ms to seconds
    const lastCandleTime = props.candleData[props.candleData.length - 1].time / 1000;
    
    chart.timeScale().setVisibleRange({
      from: firstCandleTime as Time,
      to: lastCandleTime as Time
    });
  }

  chart.priceScale('right').applyOptions({ autoScale: true });

  function updateMarkerPositions() {
    if (!chart || props.candleData.length === 0) {
      markerPositions.value = [];
      return;
    }

    const lastPoint = props.candleData[props.candleData.length - 1];
    const x = chart
      .timeScale()
      .timeToCoordinate((lastPoint.time / 1000) as Time);
    if (x === null) {
      markerPositions.value = [];
      return;
    }

    const positions: typeof markerPositions.value = [];
    dataSeries.value.forEach(series => {
      const seriesApi = seriesApis.get(series.id);
      if (!seriesApi || !chart || series.data.length === 0) return;
      const lastValue = series.data[series.data.length - 1].value;
      const y = seriesApi.priceToCoordinate(lastValue * props.priceScaleFactor);
      if (y !== null)
        positions.push({ id: series.id, color: series.color, x, y });
    });
    markerPositions.value = positions;
  }

  updateMarkerPositionsFn = updateMarkerPositions;
  requestAnimationFrame(() => requestAnimationFrame(updateMarkerPositions));
  chart
    .timeScale()
    .subscribeVisibleTimeRangeChange(() =>
      requestAnimationFrame(updateMarkerPositions)
    );
  chart
    .timeScale()
    .subscribeSizeChange(() => requestAnimationFrame(updateMarkerPositions));
}

const { currentTheme } = useTheme();

watch(
  () => [props.candleData, props.priceScaleFactor, currentTheme.value],
  initializeChart,
  { deep: true }
);

onMounted(() => {
  initializeChart();
  if (chartContainer.value) {
    const resizeObserver = new ResizeObserver(() => {
      if (chart && chartContainer.value) {
        chart.applyOptions({
          width: chartContainer.value.clientWidth,
          height: chartContainer.value.clientHeight
        });
        requestAnimationFrame(() => updateMarkerPositionsFn?.());
      }
    });
    resizeObserver.observe(chartContainer.value);
    onUnmounted(() => resizeObserver.disconnect());
  }
});

// Re-initialize chart when currency toggle changes and emit to parent
watch(useStableRate, () => {
  initializeChart();
  emit('rateToggle', useStableRate.value, effectiveRate.value);
}, { immediate: true });

onUnmounted(() => chart?.remove());
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2.5">
        <div
          v-for="series in currentValues"
          :key="series.id"
          class="flex items-center gap-1.5"
        >
          <div
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: series.color }"
          />
          {{ series.label }}
          <span class="font-semibold">
            {{ _n(series.value, 'standard', { maximumFractionDigits: pricePrecision }) }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Currency toggle (only shown if both symbols available) -->
        <button
          v-if="showCurrencyToggle"
          class="text-xs px-2 py-0.5 rounded border border-skin-border hover:bg-skin-border transition-colors"
          @click="useStableRate = !useStableRate"
        >
          {{ currentSymbol }}
        </button>
        <span class="text-skin-text">{{ currentDate }}</span>
      </div>
    </div>
    <div ref="chartContainer" class="flex-1 relative">
      <div
        v-for="marker in markerPositions"
        v-show="showDefaultMarkers"
        :key="marker.id"
        class="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        :style="{
          backgroundColor: marker.color,
          left: `${marker.x}px`,
          top: `${marker.y}px`
        }"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(a[href*='tradingview']) {
  display: none !important;
}
</style>
