<script lang="ts" setup>
import {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  SingleValueData,
  Time
} from 'lightweight-charts';
import { SupportedSeries } from '@/composables/useChart';
import { Coordinates, getSmartPosition } from '@/helpers/charts';

const MARGIN = 16;

const props = defineProps<{
  chart: IChartApi;
}>();

const tooltipRef = ref<HTMLDivElement | null>(null);
const coordinates = ref<Coordinates>({ x: 0, y: 0 });
const isVisible = ref(false);
const data = ref<SingleValueData>({
  time: 0 as Time,
  value: 0
});

function findActiveSeriesData(param: MouseEventParams<Time>): {
  series: SupportedSeries;
  data: SingleValueData;
} | null {
  for (const [series, data] of param.seriesData.entries()) {
    if (data) {
      return {
        series: series as SupportedSeries,
        data: data as SingleValueData
      };
    }
  }
  return null;
}

function getCoordinates(
  series: ISeriesApi<any>,
  data: SingleValueData,
  param: MouseEventParams<Time>
): Coordinates | null {
  if (!param.time || !series) return null;

  const priceCoordinate = series.priceToCoordinate(data.value);
  const timeCoordinate = props.chart.timeScale().timeToCoordinate(param.time);

  if (priceCoordinate === null || timeCoordinate === null) {
    return null;
  }

  return { x: timeCoordinate, y: priceCoordinate };
}

function handleCrosshairMove(param: MouseEventParams<Time>) {
  isVisible.value = false;

  if (!param.point || !param.time || !param.seriesData.size) {
    return;
  }

  const activeSeriesData = findActiveSeriesData(param);
  if (!activeSeriesData) {
    return;
  }

  const { series: activeSeries, data: activeData } = activeSeriesData;
  const coordinates = getCoordinates(activeSeries, activeData, param);

  if (!coordinates) {
    return;
  }

  data.value = {
    time: param.time,
    value: activeData.value,
    customValues: activeData.customValues
  };

  isVisible.value = true;

  nextTick(() => {
    updatePosition(coordinates);
  });
}

function updatePosition(refCoordinates: Coordinates) {
  if (!tooltipRef.value) return;

  const container = tooltipRef.value.parentElement;
  if (!container) return;

  coordinates.value = getSmartPosition(
    refCoordinates,
    tooltipRef.value,
    container,
    MARGIN
  );
}

onMounted(() => {
  props.chart.subscribeCrosshairMove(handleCrosshairMove);
});

onUnmounted(() => {
  props.chart.unsubscribeCrosshairMove(handleCrosshairMove);
});
</script>

<template>
  <div
    v-if="isVisible"
    ref="tooltipRef"
    class="absolute bg-skin-border text-skin-link px-2.5 py-2 z-50 rounded pointer-events-none whitespace-pre"
    :style="{
      left: `${coordinates.x}px`,
      top: `${coordinates.y}px`
    }"
  >
    <slot v-bind="data" />
  </div>
</template>
