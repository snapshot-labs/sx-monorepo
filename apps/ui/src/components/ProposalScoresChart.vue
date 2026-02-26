<script setup lang="ts">
import { _vp } from '@/helpers/utils';
import { ScoresTick } from '@/types';

const props = withDefaults(
  defineProps<{
    ticks: ScoresTick[];
    choices: string[];
    decimals: number;
    start: number;
    end: number;
    quorum?: number;
  }>(),
  { quorum: 0 }
);

const HEIGHT = 160;
const PADDING = { top: 24, bottom: 30, left: 24, right: 24 };
const SERIES = [
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
const CHART_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const ZERO_Y = PADDING.top + CHART_HEIGHT;

const containerRef = ref<HTMLElement | null>(null);
const { width: containerWidth } = useElementSize(containerRef);
const hoveredTimestamp = ref<number | null>(null);

const chartWidth = computed(() => containerWidth.value || 400);
const drawingWidth = computed(
  () => chartWidth.value - PADDING.left - PADDING.right
);

const sortedTicks = computed(() =>
  [...props.ticks].sort((a, b) => a.timestamp - b.timestamp)
);

const effectiveEnd = computed(() => {
  const lastTick = sortedTicks.value.at(-1);
  const end = lastTick ? Math.max(props.end, lastTick.timestamp) : props.end;
  return Math.min(end, Math.floor(Date.now() / 1000));
});

const duration = computed(() => effectiveEnd.value - props.start || 1);

const maxScore = computed(() =>
  Math.max(...sortedTicks.value.flatMap(t => t.scores), 1)
);

const scoreToY = (score: number) =>
  ZERO_Y - (score / maxScore.value) * CHART_HEIGHT;

const timestampToX = (ts: number) =>
  PADDING.left +
  Math.max(0, Math.min(1, (ts - props.start) / duration.value)) *
    drawingWidth.value;

const getTickAt = (ts: number) =>
  sortedTicks.value.findLast(t => t.timestamp <= ts) ?? null;

function buildPath(i: number, fromTs: number, toTs: number, fromZero = true) {
  // For the primary line (fromZero=true), include ticks from start onwards
  // For the grey continuation (fromZero=false), only include ticks after the hover point
  const times = sortedTicks.value
    .filter(t => t.timestamp > fromTs && t.timestamp <= toTs)
    .map(t => t.timestamp);

  const points: string[] = [];
  const startScore = getTickAt(fromTs)?.scores[i] ?? 0;

  // For grey continuation: start from hover position if there's a score
  // For primary line: check if there's a pre-start tick we need to render from start
  let lastY: number | null = null;

  if (!fromZero && startScore > 0) {
    // Grey line: start from hover position at current score
    lastY = scoreToY(startScore);
    points.push(`${timestampToX(fromTs)},${lastY}`);
  } else if (fromZero && startScore > 0) {
    // Primary line with pre-start tick: draw from chart start
    lastY = scoreToY(startScore);
    points.push(`${timestampToX(props.start)},${ZERO_Y}`);
    points.push(`${timestampToX(props.start)},${lastY}`);
  }

  for (const ts of times) {
    const score = getTickAt(ts)?.scores[i] ?? 0;
    if (score === 0 && lastY === null) continue;

    const x = timestampToX(ts);
    const y = scoreToY(score);

    if (lastY === null) {
      points.push(`${x},${ZERO_Y}`, `${x},${y}`);
    } else {
      points.push(`${x},${lastY}`, `${x},${y}`);
    }
    lastY = y;
  }

  if (lastY !== null) {
    points.push(`${timestampToX(toTs)},${lastY}`);
  }

  return points.join(' ');
}

const currentTs = computed(() => hoveredTimestamp.value ?? effectiveEnd.value);
const currentTick = computed(() => getTickAt(currentTs.value));

const lines = computed(() =>
  [...props.choices.keys()].reverse().map(i => ({
    points: buildPath(i, props.start, currentTs.value, true),
    ...SERIES[i],
    label: props.choices[i],
    score: currentTick.value
      ? _vp(currentTick.value.scores[i] / 10 ** props.decimals)
      : '0'
  }))
);

const displayLines = computed(() => [...lines.value].reverse());

const grayedLines = computed(() =>
  hoveredTimestamp.value === null
    ? []
    : [...props.choices.keys()].map(i =>
        buildPath(i, hoveredTimestamp.value!, effectiveEnd.value, false)
      )
);

const currentX = computed(() => timestampToX(currentTs.value));

const bulletPoints = computed(() => {
  const tick = currentTick.value;
  if (!tick) return [];
  return [...props.choices.keys()]
    .reverse()
    .filter(i => tick.scores[i] > 0)
    .map(i => ({
      x: currentX.value,
      y: scoreToY(tick.scores[i]),
      fill: SERIES[i].fill
    }));
});

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
  <div v-if="ticks.length > 0">
    <div class="flex justify-between items-center mb-2 px-4 py-2.5">
      <div class="flex gap-2.5">
        <div
          v-for="(line, i) in displayLines"
          :key="i"
          class="flex items-center gap-1.5"
        >
          <span class="w-2 h-2 rounded-full" :class="line.bg" />
          <span class="text-skin-text hidden md:block" v-text="line.label" />
          <span class="font-bold text-skin-link" v-text="line.score" />
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
          :y1="scoreToY(quorum)"
          :y2="scoreToY(quorum)"
          class="stroke-skin-link"
          stroke-dasharray="6 4"
          stroke-width="1"
        />
        <line
          v-if="quorum > 0 && hoveredTimestamp !== null"
          :x1="currentX"
          :x2="chartWidth - PADDING.right"
          :y1="scoreToY(quorum)"
          :y2="scoreToY(quorum)"
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
