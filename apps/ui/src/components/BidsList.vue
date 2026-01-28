<script setup lang="ts">
import UiColumnHeader from '@/components/Ui/ColumnHeader.vue';
import { AuctionNetworkId } from '@/helpers/auction';
import {
  AuctionDetailFragment,
  Order_OrderBy
} from '@/helpers/auction/gql/graphql';
import { _n } from '@/helpers/utils';
import {
  LIMIT,
  useBiddingTokenPriceQuery,
  useBidsQuery
} from '@/queries/auction';

const DEFAULT_SORT_DIRECTION = 'desc';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
  totalSupply: bigint;
}>();

const bidsHeader = ref<HTMLElement | null>(null);
const page = ref(1);
const { x: bidsHeaderX } = useScroll(bidsHeader);
const orderBy = ref<Order_OrderBy>('timestamp');
const orderDirection = ref<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);

const {
  data: orders,
  isLoading: isOrdersLoading,
  isError: isOrdersError
} = useBidsQuery({
  network: () => props.network,
  auction: () => props.auction,
  page: page,
  orderBy,
  orderDirection
});

const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useBiddingTokenPriceQuery({
    network: () => props.network,
    auction: () => props.auction
  });

const totalPageCount = computed(() => {
  return Math.ceil(props.auction.orderCount / LIMIT);
});

function handleScrollEvent(target: HTMLElement) {
  bidsHeaderX.value = target.scrollLeft;
}

function handleSortChange(field: Order_OrderBy) {
  if (orderBy.value === field) {
    orderDirection.value = orderDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    orderBy.value = field;
    orderDirection.value = DEFAULT_SORT_DIRECTION;
  }

  page.value = 1;
}
</script>
<template>
  <div class="divide-y divide-skin-border">
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
          <UiColumnHeaderItemSortable
            class="w-[200px] max-w-[200px]"
            :is-ordered="orderBy === 'timestamp'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('timestamp')"
          >
            Created
          </UiColumnHeaderItemSortable>
          <UiColumnHeaderItemSortable
            class="w-[200px] max-w-[200px]"
            :is-ordered="orderBy === 'sellAmount'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('sellAmount')"
          >
            Amount
          </UiColumnHeaderItemSortable>
          <UiColumnHeaderItemSortable
            class="w-[200px] max-w-[200px]"
            :is-ordered="orderBy === 'price'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('price')"
          >
            Max. price
          </UiColumnHeaderItemSortable>
          <div class="w-[200px] max-w-[200px] truncate">Max. FDV</div>
          <div class="w-[200px] max-w-[200px] truncate">Status</div>
          <div class="min-w-[44px] lg:w-[60px]" />
        </div>
      </UiColumnHeader>
      <UiScrollerHorizontal @scroll="handleScrollEvent">
        <div class="min-w-[880px]">
          <UiLoading
            v-if="isOrdersLoading || isBiddingTokenPriceLoading"
            class="px-4 py-3 block"
          />
          <UiStateWarning v-else-if="isOrdersError" class="px-4 py-3">
            Failed to load bids.
          </UiStateWarning>
          <UiStateWarning
            v-else-if="auction.orderCount === 0"
            class="px-4 py-3"
          >
            There are no bids yet.
          </UiStateWarning>
          <div
            v-else-if="orders && typeof biddingTokenPrice === 'number'"
            class="divide-y divide-skin-border flex flex-col justify-center"
          >
            <AuctionBid
              v-for="order in orders"
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
    </div>
    <div class="flex justify-between items-center px-4 py-3">
      <span>{{ _n(auction.orderCount) }} bids</span>
      <div class="space-x-3 flex items-center">
        <UiButton
          v-if="totalPageCount > 1"
          uniform
          :disabled="page === 1"
          title="Previous Page"
          @click="page = Math.max(page - 1, 1)"
        >
          <IH-chevron-left />
        </UiButton>
        <span> Page {{ _n(page) }} of {{ _n(totalPageCount) }}</span>
        <UiButton
          v-if="totalPageCount > 1"
          uniform
          :disabled="page >= totalPageCount"
          title="Next Page"
          @click="page += 1"
        >
          <IH-chevron-right />
        </UiButton>
      </div>
    </div>
  </div>
</template>
