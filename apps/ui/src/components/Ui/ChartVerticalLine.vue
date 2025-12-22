<script lang="ts" setup>
import { Coordinate, IChartApi, Time } from 'lightweight-charts';
import { Coordinates, getSmartPosition } from '@/helpers/charts';

type LinePosition = Coordinates & {
  height: number;
};

const LABEL_MARGIN = 0;

const props = defineProps<{
  chart: IChartApi;
  value: number;
  color: string;
}>();

const linePosition = ref<LinePosition>({ x: 0, y: 0, height: 0 });
const labelPosition = ref<Coordinates>({ x: 0, y: 0 });
const isLineVisible = ref(false);
const isLabelVisible = ref(true);
const labelRef = ref<HTMLDivElement>();

const chartContainer = computed(() => {
  return props.chart.chartElement() || null;
});

const chartCanvas = computed(() => {
  return chartContainer.value?.querySelector('canvas') || null;
});

const {
  y: chartCanvasY,
  width: chartCanvasWidth,
  height: chartCanvasHeight
} = useElementBounding(chartCanvas);
const { top: chartContainerY } = useElementBounding(chartContainer);

function updateLabelPosition() {
  if (!labelRef.value || !chartCanvas.value) {
    isLabelVisible.value = false;
    return;
  }

  labelPosition.value = getSmartPosition(
    linePosition.value,
    labelRef.value,
    chartCanvas.value,
    LABEL_MARGIN
  );

  // Hide label if it's wider than the chart
  isLabelVisible.value = labelPosition.value.x > LABEL_MARGIN;
}

function getChartCoordinate(): Coordinate | null {
  return props.chart.timeScale().timeToCoordinate(props.value as Time) || null;
}

function updatePositions() {
  isLineVisible.value = false;
  isLabelVisible.value = false;

  if (
    !chartContainer.value ||
    chartCanvasHeight.value === 0 ||
    chartCanvasWidth.value === 0
  ) {
    return;
  }

  const xCoordinate = getChartCoordinate();

  if (xCoordinate === null || xCoordinate < 0) {
    return;
  }

  linePosition.value = {
    x: xCoordinate,
    y: chartCanvasY.value - chartContainerY.value,
    height: chartCanvasHeight.value
  };

  labelPosition.value.y = chartCanvasY.value - chartContainerY.value;

  isLineVisible.value = true;
  isLabelVisible.value = true;

  nextTick(() => {
    updateLabelPosition();
  });
}

watch(
  () => props.value,
  () => {
    updatePositions();
  }
);

useResizeObserver(() => chartContainer.value, updatePositions);
</script>

<template>
  <div>
    <div
      v-if="isLineVisible"
      class="absolute w-[1px] pointer-events-none z-10"
      :style="{
        left: `${linePosition.x}px`,
        top: `${linePosition.y}px`,
        height: `${linePosition.height}px`,
        borderLeft: `1px solid ${color}`
      }"
    />
    <div
      v-if="$slots.default && isLineVisible"
      v-show="isLabelVisible"
      ref="labelRef"
      class="absolute text-sm px-2 font-bold pointer-events-none z-10 whitespace-nowrap"
      :style="{
        left: `${labelPosition.x}px`,
        top: `${labelPosition.y}px`,
        color: color
      }"
    >
      <slot />
    </div>
  </div>
</template>
