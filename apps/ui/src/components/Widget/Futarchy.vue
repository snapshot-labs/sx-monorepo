<script setup lang="ts">
import { z } from 'zod';
import { FUTARCHY_API_URL } from '@/helpers/constants';
import { _n, getUrl } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

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
  <div v-if="!loading && !error && data">
    <a
      :href="`https://app.futarchy.fi/markets/${data.event_id}?utm_source=snapshot`"
      target="_blank"
      class="block xl:flex xl:space-x-3 items-center border rounded-lg px-3.5 py-2.5 mb-4"
    >
      <div class="grow flex items-center gap-2 xl:mb-0 mb-2">
        <img
          :src="
            getUrl(
              'ipfs://bafkreigougs774ow3qwkb3kc5ftkpz43cfueputpmkii2l5meuaeivkiqq'
            )
          "
          class="size-3"
        />
        <UiEyebrow> Futarchy market </UiEyebrow>
      </div>
      <span class="flex items-center gap-1.5">
        <span>{{ data.company_tokens.base.tokenSymbol }} price</span>
        <span class="text-skin-link">
          ${{
            _n(data.spot.price_usd || 0, 'compact', {
              maximumFractionDigits: 2
            })
          }}
        </span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="bg-skin-success size-2.5 rounded-full inline-block" />
        <span>If approved</span>
        <span class="text-skin-link">
          ${{
            _n(data.conditional_yes.price_usd || 0, 'compact', {
              maximumFractionDigits: 2
            })
          }}
        </span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="bg-skin-danger size-2.5 rounded-full inline-block" />
        <span>If rejected</span>
        <span class="text-skin-link">
          ${{
            _n(data.conditional_no.price_usd || 0, 'compact', {
              maximumFractionDigits: 2
            })
          }}
        </span>
      </span>
    </a>
  </div>
</template>
