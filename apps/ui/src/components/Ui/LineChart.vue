<script setup lang="ts">
export interface LineChartSeries {
  label: string;
  data: { time: number; value: number }[];
  colorIndex?: number;
}

const props = withDefaults(
  defineProps<{
    series: LineChartSeries[];
    start: number;
    end: number;
    formatValue?: (v: number) => string;
    quorum?: number;
    startFromZero?: boolean;
    linear?: boolean;
  }>(),
  { quorum: 0, startFromZero: true, linear: false }
);

const COLORS = [
  {
    stroke: 'stroke-skin-success',
    fill: 'fill-skin-success',
    bg: 'bg-skin-success'
  },
  {
    stroke: 'stroke-skin-danger',
    fill: 'fill-skin-danger',
    bg: 'bg-skin-danger'
  },
  {
    stroke: 'stroke-skin-text',
    fill: 'fill-skin-text',
    bg: 'bg-skin-text'
  }
];

const colorOf = (i: number) =>
  COLORS[(props.series[i]?.colorIndex ?? i) % COLORS.length];

const HEIGHT = 160;
const PADDING = { top: 24, bottom: 30, left: 24, right: 24 };
const CHART_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const ZERO_Y = PADDING.top + CHART_HEIGHT;

const containerRef = ref<HTMLElement | null>(null);
const { width: containerWidth } = useElementSize(containerRef);
const hoveredTimestamp = ref<number | null>(null);

const chartWidth = computed(() => containerWidth.value || 400);
const drawingWidth = computed(
  () => chartWidth.value - PADDING.left - PADDING.right
);

const effectiveEnd = computed(() => {
  const allTimes = props.series.flatMap(s => s.data.map(d => d.time));
  const lastTime = allTimes.length ? Math.max(...allTimes) : props.end;
  const end = Math.max(props.end, lastTime);
  return Math.min(end, Math.floor(Date.now() / 1000));
});

const duration = computed(() => effectiveEnd.value - props.start || 1);

const allValues = computed(() =>
  props.series.flatMap(s => s.data.map(d => d.value)).filter(v => v > 0)
);

const minValue = computed(() => {
  if (props.startFromZero || !allValues.value.length) return 0;
  const min = Math.min(...allValues.value);
  const max = Math.max(...allValues.value);
  const padding = (max - min) * 0.1 || max * 0.01;
  return Math.max(0, min - padding);
});

const maxValue = computed(() => {
  if (!allValues.value.length) return 1;
  const max = Math.max(...allValues.value);
  if (props.startFromZero) return max;
  const padding = (max - minValue.value) * 0.1 || max * 0.01;
  return max + padding;
});

const valueToY = (v: number) => {
  const range = maxValue.value - minValue.value || 1;
  return ZERO_Y - ((v - minValue.value) / range) * CHART_HEIGHT;
};

const timestampToX = (ts: number) =>
  PADDING.left +
  Math.max(0, Math.min(1, (ts - props.start) / duration.value)) *
    drawingWidth.value;

function getValueAt(seriesIndex: number, ts: number): number {
  const data = props.series[seriesIndex]?.data;
  if (!data) return 0;

  let before: { time: number; value: number } | null = null;
  let after: { time: number; value: number } | null = null;

  for (const d of data) {
    if (d.time <= ts) before = d;
    else if (!after) after = d;
  }

  if (!before) return 0;
  if (!after || !props.linear) return before.value;

  const ratio = (ts - before.time) / (after.time - before.time);
  return before.value + ratio * (after.value - before.value);
}

function buildPath(
  seriesIndex: number,
  fromTs: number,
  toTs: number,
  fromZero = true
) {
  const data = props.series[seriesIndex]?.data;
  if (!data) return '';

  const times = data
    .filter(d => d.time > fromTs && d.time <= toTs)
    .map(d => d.time);

  const points: string[] = [];
  const startValue = getValueAt(seriesIndex, fromTs);
  let lastY: number | null = null;

  if (!fromZero && startValue > 0) {
    lastY = valueToY(startValue);
    points.push(`${timestampToX(fromTs)},${lastY}`);
  } else if (startValue > 0) {
    lastY = valueToY(startValue);
    if (props.startFromZero) {
      points.push(`${timestampToX(props.start)},${ZERO_Y}`);
    }
    points.push(`${timestampToX(props.start)},${lastY}`);
  }

  for (const ts of times) {
    const value = getValueAt(seriesIndex, ts);
    if (value === 0 && lastY === null) continue;

    const x = timestampToX(ts);
    const y = valueToY(value);

    if (lastY === null) {
      if (props.startFromZero) {
        points.push(`${x},${ZERO_Y}`);
      }
      points.push(`${x},${y}`);
    } else if (props.linear) {
      points.push(`${x},${y}`);
    } else {
      points.push(`${x},${lastY}`, `${x},${y}`);
    }
    lastY = y;
  }

  if (lastY !== null) {
    const endY = props.linear ? valueToY(getValueAt(seriesIndex, toTs)) : lastY;
    points.push(`${timestampToX(toTs)},${endY}`);
  }

  return points.join(' ');
}

const currentTs = computed(() => hoveredTimestamp.value ?? effectiveEnd.value);

const lines = computed(() =>
  [...props.series.keys()].reverse().map(i => ({
    points: buildPath(i, props.start, currentTs.value, true),
    ...colorOf(i),
    label: props.series[i].label,
    value: props.formatValue
      ? props.formatValue(getValueAt(i, currentTs.value))
      : String(getValueAt(i, currentTs.value))
  }))
);

const displayLines = computed(() => [...lines.value].reverse());

const grayedLines = computed(() =>
  hoveredTimestamp.value === null
    ? []
    : [...props.series.keys()].map(i =>
        buildPath(i, hoveredTimestamp.value!, effectiveEnd.value, false)
      )
);

const currentX = computed(() => timestampToX(currentTs.value));

const bulletPoints = computed(() =>
  [...props.series.keys()]
    .reverse()
    .map(i => ({
      x: currentX.value,
      y: valueToY(getValueAt(i, currentTs.value)),
      fill: colorOf(i).fill,
      visible: getValueAt(i, currentTs.value) > 0
    }))
    .filter(pt => pt.visible)
);

const dateLabels = computed(() => {
  if (!drawingWidth.value) return [];

  const LABEL_WIDTH = 50;
  const MIN_SPACING = 10;
  const startDate = new Date(props.start * 1000);
  startDate.setHours(0, 0, 0, 0);
  let ts = Math.floor(startDate.getTime() / 1000);
  if (ts < props.start) ts += 86400;

  const labels: { x: number; label: string }[] = [];
  let lastX = -Infinity;

  const HALF_WIDTH = LABEL_WIDTH / 2;
  while (ts <= effectiveEnd.value) {
    const x = timestampToX(ts);
    if (
      x - HALF_WIDTH >= PADDING.left &&
      x + HALF_WIDTH <= chartWidth.value - PADDING.right &&
      x - lastX >= LABEL_WIDTH + MIN_SPACING
    ) {
      labels.push({
        x,
        label: new Date(ts * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      });
      lastX = x;
    }
    ts += 86400;
  }
  return labels;
});

const displayedDate = computed(() =>
  hoveredTimestamp.value === null
    ? null
    : new Date(hoveredTimestamp.value * 1000)
        .toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
        .replace(',', ' ·')
);

function handleMouseMove(e: MouseEvent) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const ratio = Math.max(
    0,
    Math.min(1, (e.clientX - rect.left - PADDING.left) / drawingWidth.value)
  );
  hoveredTimestamp.value = props.start + ratio * duration.value;
}
</script>

<template>
  <div v-if="series.some(s => s.data.length > 0)">
    <div class="flex justify-between items-center mb-2 px-4 py-2.5">
      <div class="flex gap-2.5">
        <div
          v-for="(line, i) in displayLines"
          :key="i"
          class="flex items-center gap-1.5"
        >
          <span class="w-2 h-2 rounded-full" :class="line.bg" />
          <span class="text-skin-text hidden md:block" v-text="line.label" />
          <span class="font-bold text-skin-link" v-text="line.value" />
        </div>
      </div>
      <span
        v-if="displayedDate"
        class="text-skin-link"
        v-text="displayedDate"
      />
    </div>

    <div
      ref="containerRef"
      class="w-full"
      :style="{ height: `${HEIGHT}px` }"
      @mousemove="handleMouseMove"
      @mouseleave="hoveredTimestamp = null"
    >
      <svg
        :width="chartWidth"
        :height="HEIGHT"
        :viewBox="`0 0 ${chartWidth} ${HEIGHT}`"
      >
        <line
          v-if="quorum > 0"
          :x1="PADDING.left"
          :x2="currentX"
          :y1="valueToY(quorum)"
          :y2="valueToY(quorum)"
          class="stroke-skin-link"
          stroke-dasharray="6 4"
          stroke-width="1"
        />
        <line
          v-if="quorum > 0 && hoveredTimestamp !== null"
          :x1="currentX"
          :x2="chartWidth - PADDING.right"
          :y1="valueToY(quorum)"
          :y2="valueToY(quorum)"
          class="stroke-skin-border"
          stroke-dasharray="6 4"
          stroke-width="1"
        />
        <g
          fill="none"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline
            v-for="(line, i) in lines"
            :key="i"
            :points="line.points"
            :class="line.stroke"
          />
          <polyline
            v-for="(pts, i) in grayedLines"
            :key="`g${i}`"
            :points="pts"
            class="stroke-skin-border"
          />
        </g>
        <template v-if="end > Date.now() / 1000 && hoveredTimestamp === null">
          <circle
            v-for="(pt, i) in bulletPoints"
            :key="`h${i}`"
            :cx="pt.x"
            :cy="pt.y"
            r="8"
            :class="pt.fill"
            class="animate-halo"
          />
        </template>
        <circle
          v-for="(pt, i) in bulletPoints"
          :key="`b${i}`"
          :cx="pt.x"
          :cy="pt.y"
          r="4"
          :class="pt.fill"
        />
        <text
          v-for="(lbl, i) in dateLabels"
          :key="`l${i}`"
          :x="lbl.x"
          :y="HEIGHT - 6"
          text-anchor="middle"
          class="fill-skin-text text-[15px]"
          v-text="lbl.label"
        />
      </svg>
    </div>
  </div>
</template>
