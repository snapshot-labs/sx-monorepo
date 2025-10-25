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

interface VolumeData {
  status: string;
  pool_id: string;
  volume: string;
}

interface FutarchyResponse {
  status: string;
  proposal_id: string;
  event_id: string;
  conditional_yes: FutarchyPriceData;
  conditional_no: FutarchyPriceData;
  spot: FutarchyPriceData;
  prediction_yes: FutarchyPriceData;
  probability: number;
  volume: {
    conditional_yes: VolumeData;
    conditional_no: VolumeData;
  };
  company_tokens: TokenGroup;
  currency_tokens: TokenGroup;
  display: null;
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
      data.prediction_yes?.status === 'ok' &&
      data.prediction_yes?.price !== undefined &&
      data.probability !== undefined &&
      data.company_tokens?.base?.tokenSymbol &&
      data.currency_tokens?.base?.tokenSymbol
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
    <div
      class="block lg:flex lg:space-x-3 items-center border rounded-lg px-3.5 py-2.5 mb-4"
    >
    <div class="grow">
      <UiEyebrow>Market</UiEyebrow>
    </div>
      <span class="flex items-center gap-1.5">
      <span>{{ priceData.company_tokens.base.tokenSymbol }} price</span>
      <span class="text-skin-link">
        ${{ priceData.spot.price.toFixed(2) }}
      </span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="bg-skin-success size-2.5 rounded-full inline-block" />
        <span>If approved</span>
        <span class="text-skin-link">
          ${{ priceData.conditional_yes.price.toFixed(2) }}
        </span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="bg-skin-danger size-2.5 rounded-full inline-block" />
        <span>If rejected</span>
        <span class="text-skin-link">
          ${{ priceData.conditional_no.price.toFixed(2) }}
        </span>
      </span>
    </div>
  </div>
</template>
