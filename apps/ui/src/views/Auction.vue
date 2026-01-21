<script setup lang="ts">
import { Contract } from '@ethersproject/contracts';
import { useQuery } from '@tanstack/vue-query';
import { abis } from '@/helpers/abis';
import { AuctionNetworkId, getAuction } from '@/helpers/auction';
import { getProvider } from '@/helpers/provider';
import { getNetwork } from '@/networks';
import { AUCTION_KEYS } from '@/queries/auction';

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
  queryKey: AUCTION_KEYS.auction(
    () => params.value.network,
    () => params.value.id
  ),
  queryFn: () => getAuction(params.value.id, params.value.network),
  enabled: computed(() => !!params.value.id)
});

const {
  data: totalSupply,
  isLoading: isSupplyLoading,
  isError: isSupplyError
} = useQuery({
  queryKey: [
    'supply',
    () => auctionData.value?.auctionDetail.addressAuctioningToken
  ],
  queryFn: async () => {
    const addressAuctioningToken =
      auctionData.value?.auctionDetail.addressAuctioningToken;

    if (!addressAuctioningToken) {
      throw new Error('Auctioning token address is missing');
    }

    const contract = new Contract(
      addressAuctioningToken,
      abis.erc20,
      getProvider(getNetwork(params.value.network).chainId as number)
    );

    const totalSupply = await contract.totalSupply();

    return totalSupply.toBigInt() as bigint;
  },
  enabled: () => !!auctionData.value
});
</script>

<template>
  <div class="flex items-stretch md:flex-row flex-col w-full h-full">
    <UiLoading v-if="isLoading || isSupplyLoading" class="block p-4" />
    <UiStateWarning
      v-else-if="error || !auctionData?.auctionDetail || isSupplyError"
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
      :total-supply="totalSupply"
      v-bind="$attrs"
    />
  </div>
</template>
