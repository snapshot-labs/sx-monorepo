<script lang="ts" setup>
import { SingleValueData } from 'lightweight-charts';
import { ChartSeries } from '@/composables/useChart';

const props = defineProps<{
  series: ChartSeries[];
}>();

const localizedSeries = computed<ChartSeries[]>(() => {
  return props.series.map(config => ({
    ...config,
    data: config.data.map(point => ({
      ...point,
      time: convertTimeToLocale(point.time as number) as SingleValueData['time']
    }))
  }));
});

const { chartContainer } = useChart({ series: localizedSeries });

// Convert UTC timestamp to local timezone offset
// (effectively makes the chart interpret UTC timestamps as local time)
// see https://github.com/tradingview/lightweight-charts/blob/7104e9a4fb399f18db7a2868a91b3246014c4324/docs/time-zones.md
// All further data manipulations should be done in UTC, to avoid double offsets
function convertTimeToLocale(utcTimestamp: number): number {
  const timezoneOffset = new Date().getTimezoneOffset() * 60; // offset in seconds
  return utcTimestamp - timezoneOffset;
}
</script>

<template>
  <div ref="chartContainer" />
</template>
