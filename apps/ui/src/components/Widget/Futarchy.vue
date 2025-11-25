<script setup lang="ts">
import { z } from 'zod';
import { _n } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const FUTARCHY_API_URL =
  import.meta.env.VITE_FUTARCHY_API_URL ?? 'https://stag.api.tickspread.com';

const FutarchyResponseSchema = z.object({
  event_id: z.string(),
  conditional_yes: z.object({
    price_usd: z.number()
  }),
  conditional_no: z.object({
    price_usd: z.number()
  }),
  spot: z.object({
    price_usd: z.number().nullable()
  }),
  company_tokens: z.object({
    base: z.object({
      tokenSymbol: z.string()
    })
  })
});

type FutarchyResponse = z.infer<typeof FutarchyResponseSchema>;

const data = ref<FutarchyResponse | null>(null);
const loading: Ref<boolean> = ref(true);
const error: Ref<boolean> = ref(false);

async function fetchPrices() {
  try {
    loading.value = true;

    const res = await fetch(
      `${FUTARCHY_API_URL}/api/v1/market-events/proposals/${props.proposal.id}/prices`
    );
    const resJson = await res.json();

    const validatedData = FutarchyResponseSchema.parse(resJson);
    data.value = validatedData;
  } catch (e) {
    console.error('Error fetching Futarchy API', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchPrices());

watch(() => props.proposal.id, fetchPrices);
</script>

<template>
  <div
    v-if="!loading && !error && data"
    class="block items-center border rounded-lg p-4 mb-4"
  >
    <div class="grow flex items-center gap-2 xl:mb-0 mb-2">
      <UiEyebrow>Futarchy.fi market</UiEyebrow>
    </div>
    <div>
      <UiChart class="h-[280px] -mb-1" />
      <div class="flex justify-between items-center">
        ${{ _n(22345) }} Vol.
        <a
          :href="`https://app.futarchy.fi/markets/${data.event_id}?utm_source=snapshot`"
          target="_blank"
        >
          <UiButton primary>
            Trade
            <IH-arrow-sm-right class="-rotate-45" />
          </UiButton>
        </a>
      </div>
    </div>
  </div>
</template>
