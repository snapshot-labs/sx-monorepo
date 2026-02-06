<script setup lang="ts">
import {
  AuctionNetworkId,
  AuctionState,
  getAuctionState
} from '@/helpers/auction';
import { _n, _t, getUrl } from '@/helpers/utils';
import { enabledNetworks, getNetwork } from '@/networks';
import { useAuctionsQuery } from '@/queries/auction';

const NETWORK_IDS: AuctionNetworkId[] = ['eth', 'base', 'sep'];
const AVAILABLE_NETWORKS = NETWORK_IDS.filter(networkId =>
  enabledNetworks.includes(networkId)
);

const STATUS_OPTIONS: { id: AuctionState | 'all'; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'active', name: 'Active' },
  { id: 'finalizing', name: 'Finalizing' },
  { id: 'claiming', name: 'Claiming' },
  { id: 'claimed', name: 'Claimed' },
  { id: 'canceled', name: 'Canceled' }
];

const network = ref<AuctionNetworkId>(AVAILABLE_NETWORKS[0]);
const status = ref<AuctionState | 'all'>('all');

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

const filteredAuctions = computed(() => {
  if (!data.value) return [];

  const allAuctions = data.value.pages.flat();

  if (status.value === 'all') return allAuctions;

  return allAuctions.filter(
    auction => getAuctionState(auction, currentTimestamp.value) === status.value
  );
});

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}
</script>

<template>
  <div>
    <div class="p-4 flex gap-4">
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
      <Combobox
        v-model="status"
        class="mb-0"
        inline
        :gap="12"
        :definition="{
          type: 'string',
          title: 'Status',
          enum: STATUS_OPTIONS.map(s => s.id),
          options: STATUS_OPTIONS
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
      <div class="w-[80px]" v-text="'Bids'" />
      <div class="w-[170px]" v-text="'End date'" />
    </UiColumnHeader>
    <UiLoading v-if="isPending" class="block m-4" />
    <div v-else-if="data">
      <UiContainerInfiniteScroll
        v-if="filteredAuctions.length"
        :loading-more="isFetchingNextPage"
        @end-reached="handleEndReached"
      >
        <AppLink
          v-for="auction in filteredAuctions"
          :key="auction.id"
          :to="{
            name: 'auction-overview',
            params: { id: `${network}:${auction.id}` }
          }"
          class="text-skin-text mx-4 group overflow-hidden flex border-b items-center py-[18px] space-x-3"
        >
          <div class="flex items-center gap-2 truncate grow">
            <IS-lock-closed v-if="auction.isPrivateAuction" class="shrink-0" />
            <h3 class="truncate" v-text="`Auction #${auction.id}`" />
          </div>
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
            <div class="w-[80px]" v-text="auction.orderCount" />
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
