<script setup lang="ts">
import { z } from 'zod';
import { _n, getUrl } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const FUTARCHY_API_URL =
  import.meta.env.VITE_FUTARCHY_API_URL ?? 'https://api.futarchy.fi/charts';
const FUTARCHY_LOGO_URL =
  'ipfs://bafkreigougs774ow3qwkb3kc5ftkpz43cfueputpmkii2l5meuaeivkiqq';

const FutarchyMarketSchema = z.object({
  trading_address: z.string(),
  conditional_yes: z.object({ price_usd: z.number() }),
  conditional_no: z.object({ price_usd: z.number() }),
  spot: z.object({ price_usd: z.number().nullable() }),
  company_tokens: z.object({ base: z.object({ tokenSymbol: z.string() }) }),
  timeline: z
    .object({
      currency_rate: z.number().optional(),
      currency_rate_applied: z.boolean().optional()
    })
    .optional()
});

type FutarchyMarket = z.infer<typeof FutarchyMarketSchema>;

const data = ref<FutarchyMarket | null>(null);
const loading = ref(true);
const error = ref(false);

async function fetchPrices() {
  try {
    loading.value = true;
    const res = await fetch(
      `${FUTARCHY_API_URL}/api/v2/proposals/${props.proposal.id}/chart?minTimestamp=${props.proposal.created}&maxTimestamp=${Math.floor(Date.now() / 1000)}&includeSpot=true`
    );
    data.value = FutarchyMarketSchema.parse((await res.json()).market);
  } catch (e) {
    console.error('Error fetching Futarchy API', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPrices);
watch(() => props.proposal.id, fetchPrices);
</script>

<template>
  <AppLink
    v-if="!loading && !error && data"
    :to="`https://futarchy.fi/market?proposalId=${data.trading_address}&utm_source=snapshot`"
    class="block xl:flex xl:space-x-3 items-center border rounded-lg px-3.5 py-2.5 mb-4"
  >
    <div class="grow flex items-center gap-2 xl:mb-0 mb-2">
      <img :src="getUrl(FUTARCHY_LOGO_URL) as string" class="size-3" />
      <UiEyebrow> Futarchy.fi </UiEyebrow>
    </div>
    <template v-if="proposal.max_end >= Date.now() / 1000">
      <span
        v-if="data.spot.price_usd"
        class="flex items-center gap-1.5 whitespace-nowrap"
      >
        <span>{{ data.company_tokens.base.tokenSymbol }} price</span>
        <span class="text-skin-link font-bold">
          ${{
            _n(
              data.spot.price_usd *
                (data.timeline?.currency_rate_applied
                  ? 1
                  : data.timeline?.currency_rate ?? 1),
              'compact',
              { maximumFractionDigits: data.spot.price_usd >= 1 ? 2 : 4 }
            )
          }}
        </span>
      </span>
      <span class="flex items-center gap-1.5 whitespace-nowrap">
        <span
          class="bg-skin-success size-2.5 rounded-full inline-block shrink-0"
        />
        <span>If approved</span>
        <span class="text-skin-link font-bold">
          ${{
            _n(data.conditional_yes.price_usd, 'compact', {
              maximumFractionDigits: data.conditional_yes.price_usd >= 1 ? 2 : 4
            })
          }}
        </span>
      </span>
      <span class="flex items-center gap-1.5 whitespace-nowrap">
        <span
          class="bg-skin-danger size-2.5 rounded-full inline-block shrink-0"
        />
        <span>If rejected</span>
        <span class="text-skin-link font-bold">
          ${{
            _n(data.conditional_no.price_usd, 'compact', {
              maximumFractionDigits: data.conditional_no.price_usd >= 1 ? 2 : 4
            })
          }}
        </span>
      </span>
    </template>
    <span v-else class="italic"> The futarchy market is closed. </span>
  </AppLink>
</template>
