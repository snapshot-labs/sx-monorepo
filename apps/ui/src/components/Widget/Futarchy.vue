<script setup lang="ts">
import { useFutarchy } from '@/composables/useFutarchy';
import { _n } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const proposalId = computed(() => props.proposal.id);
const startTimestamp = computed(() => props.proposal.start);
const maxTimestamp = computed(() => props.proposal.max_end);

const {
  marketData,
  candleData,
  priceScaleFactor,
  totalVolumeUsd,
  loadingChart,
  error
} = useFutarchy(proposalId, startTimestamp, maxTimestamp);
</script>

<template>
  <!-- Only show when we have valid market + candle data, hide on error or during loading -->
  <div v-if="!error && !loadingChart && marketData && candleData.length > 0" class="border rounded-lg p-4 mb-4">
    <UiChart
      class="!h-[280px] mb-2"
      :candle-data="candleData"
      :price-scale-factor="priceScaleFactor"
      :start-timestamp="proposal.start"
      :max-timestamp="proposal.max_end"
    />
    <div class="flex justify-between items-center">
      ${{ _n(Math.round(totalVolumeUsd), 'standard') }} Vol.
      <a
        :href="`https://app.futarchy.fi/markets/${marketData.event_id}?utm_source=snapshot`"
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
