<script setup lang="ts">
import { useFutarchy } from '@/composables/useFutarchy';
import { _n } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const proposalId = computed(() => props.proposal.id);
const maxTimestamp = computed(() => props.proposal.max_end);

const {
  marketData,
  candleData,
  priceScaleFactor,
  totalVolumeUsd,
  loadingChart,
  error
} = useFutarchy(proposalId, maxTimestamp);
</script>

<template>
  <div v-if="!error && marketData" class="border rounded-lg p-4 mb-4">
    <div
      v-if="loadingChart || candleData.length === 0"
      class="flex items-center justify-center h-[280px] mb-2"
    >
      <UiLoading />
    </div>
    <UiChart
      v-else
      class="!h-[280px] mb-2"
      :candle-data="candleData"
      :price-scale-factor="priceScaleFactor"
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
