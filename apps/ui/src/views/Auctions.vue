<script setup lang="ts">
import { AuctionNetworkId, getAuctionState } from '@/helpers/auction';
import { _n, _t, getUrl } from '@/helpers/utils';
import { enabledNetworks, getNetwork } from '@/networks';
import { useAuctionsQuery } from '@/queries/auction';

const NETWORK_IDS: AuctionNetworkId[] = ['eth', 'base', 'sep'];
const AVAILABLE_NETWORKS = NETWORK_IDS.filter(networkId =>
  enabledNetworks.includes(networkId)
);

const network = ref<AuctionNetworkId>(NETWORK_IDS[0]);

const currentTimestamp = useTimestamp({ interval: 1000 });
const { data, fetchNextPage, hasNextPage, isPending, isFetchingNextPage } =
  useAuctionsQuery({
    network
  });

const networks = computed(() => {
  return AVAILABLE_NETWORKS.map(networkId => {
    const network = getNetwork(networkId);

    return {
      id: networkId,
      name: network.name,
      icon: h('img', {
        src: getUrl(network.avatar),
        alt: network.name,
        class: 'rounded-full size-3.5'
      })
    };
  });
});

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}
</script>

<template>
  <div>
    <div class="p-4">
      <Combobox
        v-model="network"
        class="mb-0"
        inline
        :gap="12"
        :definition="{
          type: 'string',
          title: 'Network',
          enum: networks.map(c => c.id),
          options: networks
        }"
      />
    </div>

    <UiSectionHeader label="Auctions" sticky />
    <UiColumnHeader class="hidden md:flex text-center">
      <div class="grow" />
      <div class="w-[100px]" v-text="'Selling'" />
      <div class="w-[100px]" v-text="'Buying'" />
      <div class="w-[100px]" v-text="'Status'" />
      <div class="w-[100px]" v-text="'Volume'" />
      <div class="w-[170px]" v-text="'End date'" />
    </UiColumnHeader>
    <UiLoading v-if="isPending" class="block m-4" />
    <div v-else-if="data">
      <UiContainerInfiniteScroll
        v-if="data.pages.flat().length"
        :loading-more="isFetchingNextPage"
        @end-reached="handleEndReached"
      >
        <AppLink
          v-for="auction in data.pages.flat()"
          :key="auction.id"
          :to="{
            name: 'auction-overview',
            params: { id: `${network}:${auction.id}` }
          }"
          class="text-skin-text mx-4 group overflow-hidden flex border-b items-center py-[18px] space-x-3"
        >
          <h3 class="truncate grow" v-text="`Auction #${auction.id}`" />
          <div class="hidden md:flex font-bold text-center text-skin-link">
            <div class="w-[100px] truncate px-2">
              {{ auction.symbolAuctioningToken }}
            </div>
            <div class="w-[100px] truncate px-2">
              {{ auction.symbolBiddingToken }}
            </div>
            <div class="w-[100px]">
              {{ getAuctionState(auction, currentTimestamp) }}
            </div>
            <div class="w-[100px] truncate px-2">
              {{
                _n(
                  Number(auction.currentBiddingAmount) /
                    10 ** Number(auction.decimalsBiddingToken),
                  'compact'
                )
              }}
              {{ auction.symbolBiddingToken }}
            </div>
            <div class="w-[170px]">
              {{ _t(auction.endTimeTimestamp) }}
            </div>
          </div>
        </AppLink>
      </UiContainerInfiniteScroll>
      <UiStateWarning v-else class="px-4 py-3">
        No results found for your search
      </UiStateWarning>
    </div>
  </div>
</template>
