<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { AuctionNetworkId, getAuction } from '@/helpers/auction';

defineOptions({ inheritAttrs: false });

const route = useRoute();

const params = computed(() => {
  const [network = 'sep', id = ''] =
    route.params.id?.toString().split(':') || [];

  return { network: network as AuctionNetworkId, id };
});

const {
  data: auctionData,
  isLoading,
  error
} = useQuery({
  queryKey: computed(() => ['auction', params.value.network, params.value.id]),
  queryFn: () => getAuction(params.value.id, params.value.network),
  enabled: computed(() => !!params.value.id)
});
</script>

<template>
  <div class="flex items-stretch md:flex-row flex-col w-full h-full">
    <UiLoading v-if="isLoading" class="block p-4" />
    <UiStateWarning
      v-else-if="error || !auctionData?.auctionDetail"
      class="px-4 py-3"
    >
      {{
        error
          ? `Failed to load auction data: ${error.message}`
          : 'Auction not found'
      }}
    </UiStateWarning>
    <router-view
      v-else-if="auctionData"
      :auction="auctionData.auctionDetail"
      :network="params.network"
      :auction-id="params.id"
      v-bind="$attrs"
    />
  </div>
</template>
