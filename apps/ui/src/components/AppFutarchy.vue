<script setup lang="ts">
import { FUTARCHY_API_URL } from '@/helpers/constants';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

interface FutarchyPriceData {
  status: string;
  pool_id: string;
  interval: string;
  price: number;
  timestamp: number;
}

interface TokenInfo {
  tokenName: string;
  tokenSymbol: string;
  wrappedCollateralTokenAddress: string;
}

interface TokenGroup {
  yes: TokenInfo;
  no: TokenInfo;
  base: TokenInfo;
}

interface DisplayConfig {
  main: number;
  price: number;
  amount: number;
  balance: number;
  company: number;
  default: number;
  currency: number;
  swapPrice: number;
  percentage: number;
  smallNumbers: number;
}

interface FutarchyResponse {
  status: string;
  proposal_id: string;
  event_id: string;
  conditional_yes: FutarchyPriceData;
  conditional_no: FutarchyPriceData;
  spot: FutarchyPriceData;
  company_tokens: TokenGroup;
  currency_tokens: TokenGroup;
  display: DisplayConfig;
}

const priceData = ref<FutarchyResponse | null>(null);
const isLoading = ref(true);
const hasError = ref(false);

const fetchPrices = async () => {
  try {
    isLoading.value = true;
    hasError.value = false;

    const response = await fetch(
      `${FUTARCHY_API_URL}/api/v1/market-events/proposals/${props.proposal.id}/prices`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch futarchy prices');
    }

    const data: FutarchyResponse = await response.json();

    // Validate that ALL required fields are present and have valid status
    // IMPORTANT: event_id is required for linking to Futarchy market page
    if (
      data.status === 'ok' &&
      data.proposal_id &&
      data.event_id &&
      data.conditional_yes?.status === 'ok' &&
      data.conditional_yes?.pool_id &&
      data.conditional_yes?.price !== undefined &&
      data.conditional_no?.status === 'ok' &&
      data.conditional_no?.pool_id &&
      data.conditional_no?.price !== undefined &&
      data.spot?.status === 'ok' &&
      data.spot?.pool_id &&
      data.spot?.price !== undefined &&
      data.company_tokens?.base?.tokenSymbol &&
      data.currency_tokens?.base?.tokenSymbol &&
      data.display?.price !== undefined &&
      typeof data.display?.price === 'number'
    ) {
      priceData.value = data;
    } else {
      hasError.value = true;
    }
  } catch (error) {
    console.error('Error fetching futarchy prices:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchPrices();
});

watch(() => props.proposal.id, fetchPrices);
</script>

<template>
  <div v-if="!isLoading && !hasError && priceData">
    <h4 class="mb-2.5 eyebrow flex items-center gap-2">
      <img
        src="https://pbs.twimg.com/profile_images/1854253059095859212/AZPGrAaV_400x400.jpg"
        class="size-[20px]"
      />
      <span>Futarchy.fi</span>
    </h4>
    <div class="leading-6">
      <div class="mb-2.5">
        Predict how this proposal will impact {{ priceData.company_tokens.base.tokenSymbol }}'s price through conditional
        markets on Futarchy.fi.
        <a href="https://futarchy.fi" target="_blank" rel="noopener noreferrer">Learn more</a>.
      </div>
      <div class="mb-3 rounded-lg border px-3 py-2.5">
        <div class="flex justify-between">
          <span><b>{{ priceData.company_tokens.base.tokenSymbol }}</b> price</span>
          <span class="text-skin-link">{{ priceData.spot.price.toFixed(priceData.display.price) }} {{ priceData.currency_tokens.base.tokenSymbol }}</span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-2">
            <span class="bg-skin-success size-2.5 rounded-full inline-block" />
            <span>If approved</span>
          </span>
          <span class="text-skin-link">{{ priceData.conditional_yes.price.toFixed(priceData.display.price) }} {{ priceData.currency_tokens.base.tokenSymbol }}</span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-2">
            <span class="bg-skin-danger size-2.5 rounded-full inline-block" />
            <span>If rejected</span>
          </span>
          <span class="text-skin-link">{{ priceData.conditional_no.price.toFixed(priceData.display.price) }} {{ priceData.currency_tokens.base.tokenSymbol }}</span>
        </div>
      </div>
      <div>
        <a
          :href="`https://app.futarchy.fi/market?proposalId=${priceData.event_id}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          <UiButton class="flex items-center justify-center gap-2 w-full">
            <span>Trade on Futarchy.fi</span>
            <IH-arrow-sm-right class="-rotate-45" />
          </UiButton>
        </a>
      </div>
    </div>
  </div>
</template>
