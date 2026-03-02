<script setup lang="ts">
import { LineChartSeries } from '@/components/Ui/LineChart.vue';
import { _n } from '@/helpers/utils';
import { useFutarchyQuery } from '@/queries/futarchy';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const { data, isPending } = useFutarchyQuery(
  () => props.proposal.id,
  () => props.proposal.start,
  () => props.proposal.max_end
);

const formatPrice = (v: number) =>
  `$${_n(v, 'standard', {
    maximumFractionDigits: data.value?.pricePrecision ?? 6
  })}`;

const chartStart = computed(() => {
  const first = data.value?.candles.find(p => p.yes > 0 && p.no > 0);
  return first ? first.time / 1000 : props.proposal.start;
});

const chartSeries = computed<LineChartSeries[]>(() => {
  if (!data.value) return [];
  const rate = data.value.currencyRate;
  const minTime = chartStart.value * 1000;
  const filtered = data.value.candles.filter(p => p.time >= minTime);
  return [
    {
      label: 'Spot',
      colorIndex: 2,
      data: filtered.map(p => ({ time: p.time / 1000, value: p.spot * rate }))
    },
    {
      label: 'If approved',
      colorIndex: 0,
      data: filtered.map(p => ({ time: p.time / 1000, value: p.yes * rate }))
    },
    {
      label: 'If rejected',
      colorIndex: 1,
      data: filtered.map(p => ({ time: p.time / 1000, value: p.no * rate }))
    }
  ].filter(s => s.data.some(d => d.value > 0));
});
</script>

<template>
  <div
    v-if="isPending"
    class="flex items-center justify-center"
    style="height: 160px"
  >
    <UiLoading />
  </div>
  <div v-else-if="data && data.candles.length > 0">
    <div class="border-b pb-3">
      <UiLineChart
        :series="chartSeries"
        :start="chartStart"
        :end="proposal.max_end"
        :format-value="formatPrice"
        :start-from-zero="false"
        linear
      />
    </div>
    <div class="flex items-center justify-between text-skin-link px-4 py-3">
      <span
        >Profit from predicting this proposal's impact on the token price.</span
      >
      <a
        :href="`https://app.futarchy.fi/market?proposalId=${data.tradingAddress}&utm_source=snapshot`"
        target="_blank"
      >
        <UiButton primary>
          Trade
          <IH-arrow-sm-right class="-rotate-45" />
        </UiButton>
      </a>
    </div>
  </div>
</template>
