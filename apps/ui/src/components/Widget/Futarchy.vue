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
  currencyInfo,
  loadingChart,
  error
} = useFutarchy(proposalId, startTimestamp, maxTimestamp);

// Track toggle state from Chart component
const useStableRate = ref(true);
const currentRate = ref(1);

<<<<<<< fabien/futarchy-next
function handleRateToggle(useStable: boolean, rate: number) {
  useStableRate.value = useStable;
  currentRate.value = rate;
=======
    const res = await fetch(
      `${FUTARCHY_API_URL}/api/v1/market-events/proposals/${props.proposal.id}/prices`
    );
    const resJson = await res.json();

    if (resJson.status !== 'ok') return;

    const validatedData = FutarchyResponseSchema.parse(resJson);
    data.value = validatedData;
  } catch (e) {
    console.error('Error fetching Futarchy API', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
>>>>>>> master
}

// Computed volume based on toggle state
const displayVolume = computed(() => {
  return Math.round(totalVolumeUsd.value * currentRate.value);
});

// Currency symbol for volume based on toggle
const volumeSymbol = computed(() => {
  if (!currencyInfo.value) return '$';
  return useStableRate.value ? '$' : currencyInfo.value.tokenSymbol;
});
</script>

<template>
<<<<<<< fabien/futarchy-next
  <!-- Only show when we have valid market + candle data, hide on error or during loading -->
  <div v-if="!error && !loadingChart && marketData && candleData.length > 0" class="border rounded-lg p-3 sm:p-4 mb-4">
    <UiChart
      class="!h-[200px] sm:!h-[280px] mb-2"
      :candle-data="candleData"
      :price-scale-factor="priceScaleFactor"
      :start-timestamp="proposal.start"
      :max-timestamp="proposal.max_end"
      :price-precision="(marketData as any).timeline?.price_precision ?? 6"
      :currency-info="currencyInfo"
      @rate-toggle="handleRateToggle"
    />
    <div class="flex flex-wrap justify-between items-center gap-2 text-sm sm:text-base">
      <span>{{ volumeSymbol === '$' ? '$' : '' }}{{ _n(displayVolume, 'standard') }}{{ volumeSymbol !== '$' ? ` ${volumeSymbol}` : '' }} Vol.</span>
      <a
        :href="`https://app.futarchy.fi/market?proposalId=${marketData.trading_address || marketData.event_id}&utm_source=snapshot`"
        target="_blank"
      >
        <UiButton primary>
          Trade
          <IH-arrow-sm-right class="-rotate-45" />
        </UiButton>
      </a>
    </div>
=======
  <div v-if="!loading && !error && data">
    <AppLink
      :to="`https://app.futarchy.fi/markets/${data.event_id}?utm_source=snapshot`"
      class="block xl:flex xl:space-x-3 items-center border rounded-lg px-3.5 py-2.5 mb-4"
    >
      <div class="grow flex items-center gap-2 xl:mb-0 mb-2">
        <img :src="getUrl(FUTARCHY_LOGO_URL) as string" class="size-3" />
        <UiEyebrow> Futarchy.fi </UiEyebrow>
      </div>
      <template v-if="!proposalIsClosed">
        <span v-if="data.spot.price_usd" class="flex items-center gap-1.5">
          <span>{{ data.company_tokens.base.tokenSymbol }} price</span>
          <span class="text-skin-link font-bold">
            ${{
              _n(data.spot.price_usd, 'compact', {
                maximumFractionDigits: 4
              })
            }}
          </span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="bg-skin-success size-2.5 rounded-full inline-block" />
          <span>If approved</span>
          <span class="text-skin-link font-bold">
            ${{
              _n(data.conditional_yes.price_usd, 'compact', {
                maximumFractionDigits: 4
              })
            }}
          </span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="bg-skin-danger size-2.5 rounded-full inline-block" />
          <span>If rejected</span>
          <span class="text-skin-link font-bold">
            ${{
              _n(data.conditional_no.price_usd, 'compact', {
                maximumFractionDigits: 4
              })
            }}
          </span>
        </span>
      </template>
      <span v-else class="italic"> The futarchy market is closed. </span>
    </AppLink>
>>>>>>> master
  </div>
</template>
