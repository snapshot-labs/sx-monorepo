<script setup lang="ts">
import { UiColumnHeader } from '@snapshot-labs/tune';
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

const columnHeaderRef = ref<InstanceType<typeof UiColumnHeader> | null>(null);
const page = ref(1);
const orderBy = ref<Order_OrderBy>('timestamp');
const orderDirection = ref<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);

const {
  data: orders,
  isLoading: isOrdersLoading,
  isFetching,
  isError: isOrdersError
} = useBidsQuery({
  network: () => props.network,
  auction: () => props.auction,
  page,
  orderBy,
  orderDirection
});

const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useBiddingTokenPriceQuery({
    network: () => props.network,
    tokenAddress: () => props.auction.addressBiddingToken
  });

const { x: columnHeaderX } = useScroll(
  () => columnHeaderRef.value?.container ?? null
);

const totalPageCount = computed(() => {
  const pages = Math.ceil(props.auction.orderCount / LIMIT);
  return pages === 0 ? 1 : pages;
});

function handleScrollEvent(target: HTMLElement) {
  columnHeaderX.value = target.scrollLeft;
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
        ref="columnHeaderRef"
        class="!px-0 py-2 text-sm tracking-wider overflow-hidden"
        :sticky="false"
      >
        <div
          class="flex px-4 gap-3 text-sm tracking-wider min-w-[880px] w-full"
        >
          <UiColumnHeaderItem class="flex-1 min-w-[168px] uppercase">
            Bidder
          </UiColumnHeaderItem>
          <UiColumnHeaderItem
            class="w-[200px] max-w-[200px] uppercase"
            :is-ordered="orderBy === 'timestamp'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('timestamp')"
          >
            Created
          </UiColumnHeaderItem>
          <UiColumnHeaderItem
            class="w-[200px] max-w-[200px] uppercase"
            :is-ordered="orderBy === 'sellAmount'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('sellAmount')"
          >
            Amount
          </UiColumnHeaderItem>
          <UiColumnHeaderItem
            class="w-[200px] max-w-[200px] uppercase"
            :is-ordered="orderBy === 'price'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('price')"
          >
            Max. price
          </UiColumnHeaderItem>
          <UiColumnHeaderItem class="w-[200px] max-w-[200px] uppercase">
            Max. FDV
          </UiColumnHeaderItem>
          <UiColumnHeaderItem class="w-[200px] max-w-[200px] uppercase">
            Status
          </UiColumnHeaderItem>
          <UiColumnHeaderItem class="min-w-[20px] lg:w-[40px] justify-end" />
        </div>
      </UiColumnHeader>
      <UiScrollerHorizontal @scroll="handleScrollEvent">
        <div class="min-w-[880px]" :class="{ 'opacity-60': isFetching }">
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
    <div
      v-if="auction.orderCount"
      class="flex justify-center items-center space-x-3 px-4 py-3"
    >
      <UiButton
        v-if="totalPageCount > 1"
        uniform
        :disabled="page === 1 || isFetching"
        title="Previous Page"
        @click="page = page - 1"
      >
        <IH-chevron-left />
      </UiButton>
      <span>Page {{ _n(page) }} of {{ _n(totalPageCount) }}</span>
      <UiButton
        v-if="totalPageCount > 1"
        uniform
        :disabled="page >= totalPageCount || isFetching"
        title="Next Page"
        @click="page += 1"
      >
        <IH-chevron-right />
      </UiButton>
    </div>
  </div>
</template>
