<script setup lang="ts">
import { PRICE_PER_REQUEST } from '@/helpers/keycard';
import { UsageBucket } from '@/helpers/keycard/types';
import { _n } from '@/helpers/utils';

const props = defineProps<{
  series: UsageBucket[];
  rangeLabel: string;
}>();

const HEIGHT = 150;
const PADDING = { top: 8, bottom: 22, left: 4, right: 4 };
const GAP_RATIO = 0.35;
const CHART_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const ZERO_Y = PADDING.top + CHART_HEIGHT;

const containerRef = ref<HTMLElement | null>(null);
const { width: containerWidth } = useElementSize(containerRef);
const hoveredIndex = ref<number | null>(null);

const chartWidth = computed(() => containerWidth.value || 480);
const drawingWidth = computed(
  () => chartWidth.value - PADDING.left - PADDING.right
);

const maxTotal = computed(() =>
  Math.max(...props.series.map(bucket => bucket.hub + bucket.score), 1)
);
const slot = computed(
  () => drawingWidth.value / Math.max(props.series.length, 1)
);
const barWidth = computed(() => slot.value * (1 - GAP_RATIO));

const bars = computed(() =>
  props.series.map((bucket, index) => {
    const hubHeight = (bucket.hub / maxTotal.value) * CHART_HEIGHT;
    const scoreHeight = (bucket.score / maxTotal.value) * CHART_HEIGHT;
    const slotX = PADDING.left + index * slot.value;
    return {
      index,
      label: bucket.label,
      hubValue: bucket.hub,
      scoreValue: bucket.score,
      slotX,
      x: slotX + (slot.value - barWidth.value) / 2,
      hub: { y: ZERO_Y - hubHeight, height: hubHeight },
      score: { y: ZERO_Y - hubHeight - scoreHeight, height: scoreHeight }
    };
  })
);

const labelStep = computed(() =>
  Math.max(1, Math.ceil(props.series.length / 6))
);

const totals = computed(() => ({
  hub: props.series.reduce((sum, bucket) => sum + bucket.hub, 0),
  score: props.series.reduce((sum, bucket) => sum + bucket.score, 0)
}));

const hovered = computed(() =>
  hoveredIndex.value === null ? null : bars.value[hoveredIndex.value]
);

// Legend numbers track the hovered bucket, or the whole period at rest.
const shownHub = computed(() =>
  hovered.value ? hovered.value.hubValue : totals.value.hub
);
const shownScore = computed(() =>
  hovered.value ? hovered.value.scoreValue : totals.value.score
);

const shownHubCost = computed(() => shownHub.value * PRICE_PER_REQUEST.hub);
const shownScoreCost = computed(
  () => shownScore.value * PRICE_PER_REQUEST.score
);

const periodTotal = computed(() => totals.value.hub + totals.value.score);
</script>

<template>
  <div v-if="series.length">
    <div class="flex items-center justify-between gap-2 mb-3 text-sm">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-skin-link" />
          <span class="text-skin-text">Hub</span>
          <span class="font-semibold text-skin-link">
            {{ _n(shownHub) }} (${{ shownHubCost.toFixed(2) }})
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-skin-text" />
          <span class="text-skin-text">Score</span>
          <span class="font-semibold text-skin-link">
            {{ _n(shownScore) }} (${{ shownScoreCost.toFixed(2) }})
          </span>
        </div>
      </div>
      <span
        :class="hovered ? 'text-skin-link' : 'text-skin-text'"
        v-text="hovered ? hovered.label : rangeLabel"
      />
    </div>

    <div
      v-if="periodTotal === 0"
      class="text-sm text-skin-text text-center py-10"
    >
      No requests in this period yet.
    </div>
    <div
      v-else
      ref="containerRef"
      class="w-full"
      :style="{ height: `${HEIGHT}px` }"
    >
      <svg
        :width="chartWidth"
        :height="HEIGHT"
        :viewBox="`0 0 ${chartWidth} ${HEIGHT}`"
      >
        <g
          v-for="bar in bars"
          :key="bar.index"
          @mouseenter="hoveredIndex = bar.index"
          @mouseleave="hoveredIndex = null"
        >
          <rect
            :x="bar.slotX"
            :y="PADDING.top"
            :width="slot"
            :height="CHART_HEIGHT"
            fill="transparent"
          />
          <rect
            :x="bar.x"
            :y="bar.hub.y"
            :width="barWidth"
            :height="bar.hub.height"
            class="fill-skin-link"
            :class="{
              'opacity-40': hoveredIndex !== null && hoveredIndex !== bar.index
            }"
          />
          <rect
            :x="bar.x"
            :y="bar.score.y"
            :width="barWidth"
            :height="bar.score.height"
            class="fill-skin-text"
            :class="{
              'opacity-40': hoveredIndex !== null && hoveredIndex !== bar.index
            }"
          />
        </g>
        <text
          v-for="bar in bars"
          v-show="bar.index % labelStep === 0"
          :key="`label-${bar.index}`"
          :x="bar.x + barWidth / 2"
          :y="HEIGHT - 6"
          text-anchor="middle"
          class="fill-skin-text text-[13px]"
          v-text="bar.label"
        />
      </svg>
    </div>
  </div>
</template>
