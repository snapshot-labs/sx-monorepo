<script setup lang="ts">
import { z } from 'zod';
import { _n, getUrl } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const proposalIsClosed = computed(
  () => props.proposal.max_end < Date.now() / 1000
);

const FUTARCHY_API_URL =
  import.meta.env.VITE_FUTARCHY_API_URL ?? 'https://stag.api.tickspread.com';
const FUTARCHY_LOGO_URL =
  'ipfs://bafkreigougs774ow3qwkb3kc5ftkpz43cfueputpmkii2l5meuaeivkiqq';

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

    if (resJson.status !== 'ok') return;

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
  </div>
</template>
