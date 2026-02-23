<script setup lang="ts">
import { ChartTick } from '@/components/LineChart.vue';
import { _vp } from '@/helpers/utils';
import { ScoresTick } from '@/types';

const COLORS = ['success', 'danger', 'text'];

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

const chartTicks = computed<ChartTick[]>(() =>
  props.ticks.map(t => ({ timestamp: t.timestamp, values: [...t.scores] }))
);

const chartSeries = computed(() =>
  COLORS.map((c, i) => ({
    label: props.choices[i] || `Choice ${i + 1}`,
    stroke: `stroke-skin-${c}`,
    fill: `fill-skin-${c}`,
    bg: `bg-skin-${c}`
  }))
);

const formatValue = (v: number) => _vp(v / 10 ** props.decimals);
</script>

<template>
  <LineChart
    :ticks="chartTicks"
    :series="chartSeries"
    :start="start"
    :end="end"
    :format-value="formatValue"
    :threshold-value="quorum"
  />
</template>
