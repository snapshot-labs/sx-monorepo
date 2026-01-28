<script setup lang="ts">
import UiColumnHeader from '@/components/Ui/ColumnHeader.vue';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _n } from '@/helpers/utils';
import {
  LIMIT,
  useBiddingTokenPriceQuery,
  useBidsQuery
} from '@/queries/auction';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
  totalSupply: bigint;
}>();

const bidsHeader = ref<HTMLElement | null>(null);
const allOrdersPage = ref(1);
const { x: bidsHeaderX } = useScroll(bidsHeader);

const {
  data: allOrders,
  isLoading: isAllOrdersLoading,
  isError: isAllOrdersError
} = useBidsQuery({
  network: () => props.network,
  auction: () => props.auction,
  page: allOrdersPage
});

const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useBiddingTokenPriceQuery({
    network: () => props.network,
    auction: () => props.auction
  });

const allOrdersTotalPages = computed(() => {
  if (!allOrders.value) {
    return 1;
  }
  return Math.ceil(props.auction.orderCount / LIMIT);
});

function handleScrollEvent(target: HTMLElement) {
  bidsHeaderX.value = target.scrollLeft;
}
</script>
<template>
  <div class="space-y-4">
    <div class="overflow-hidden">
      <UiColumnHeader
        :ref="
          ref =>
            (bidsHeader =
              (ref as InstanceType<typeof UiColumnHeader> | null)?.container ??
              null)
        "
        class="!px-0 py-2 uppercase text-sm tracking-wider overflow-hidden"
        :sticky="false"
      >
        <div
          class="flex px-4 gap-3 uppercase text-sm tracking-wider min-w-[880px] w-full"
        >
          <div class="flex-1 min-w-[168px] truncate">Bidder</div>
          <div class="w-[200px] max-w-[200px] truncate">Created</div>
          <div class="w-[200px] max-w-[200px] truncate">Amount</div>
          <div class="w-[200px] max-w-[200px] truncate">Max. price</div>
          <div class="w-[200px] max-w-[200px] truncate">Max. FDV</div>
          <div class="w-[200px] max-w-[200px] truncate">Status</div>
          <div class="min-w-[44px] lg:w-[60px]" />
        </div>
      </UiColumnHeader>
      <UiScrollerHorizontal @scroll="handleScrollEvent">
        <div class="min-w-[880px]">
          <UiLoading
            v-if="isAllOrdersLoading || isBiddingTokenPriceLoading"
            class="px-4 py-3 block"
          />
          <UiStateWarning v-else-if="isAllOrdersError" class="px-4 py-3">
            Failed to load bids.
          </UiStateWarning>
          <UiStateWarning
            v-else-if="auction.orderCount === 0"
            class="px-4 py-3"
          >
            There are no bids yet.
          </UiStateWarning>
          <div
            v-else-if="allOrders && typeof biddingTokenPrice === 'number'"
            class="divide-y divide-skin-border flex flex-col justify-center border-b"
          >
            <AuctionBid
              v-for="order in allOrders"
              :key="order.id"
              :network-id="network"
              :auction-id="auction.id"
              :auction="auction"
              :order="order"
              :bidding-token-price="biddingTokenPrice"
              :total-supply="totalSupply"
            />
          </div>
        </div>
      </UiScrollerHorizontal>
      <div class="flex justify-between px-4 py-3">
        <span>{{ _n(auction.orderCount) }} bids</span>
        <div class="space-x-2">
          <UiButton
            v-if="allOrdersTotalPages > 1"
            :disabled="allOrdersPage === 1"
            @click="allOrdersPage = Math.max(allOrdersPage - 1, 1)"
          >
            Previous
          </UiButton>
          <span>
            Page {{ _n(allOrdersPage) }} of {{ _n(allOrdersTotalPages) }}</span
          >
          <UiButton
            v-if="allOrdersTotalPages > 1"
            :disabled="allOrdersPage >= allOrdersTotalPages"
            @click="allOrdersPage += 1"
          >
            Next
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
