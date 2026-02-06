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
  <div>
    <div class="overflow-hidden">
      <UiColumnHeader
        ref="columnHeaderRef"
        class="!px-0 py-2 uppercase text-sm tracking-wider overflow-hidden"
        :sticky="false"
      >
        <div
          class="flex px-4 gap-3 uppercase text-sm tracking-wider min-w-[930px] w-full"
        >
          <div class="w-[260px] max-w-[260px] truncate">Bidder</div>
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
          <UiColumnHeaderItemSortable
            class="w-[200px] max-w-[200px]"
            :is-ordered="orderBy === 'timestamp'"
            :order-direction="orderDirection"
            @sort-change="handleSortChange('timestamp')"
          >
            Created
          </UiColumnHeaderItemSortable>
          <div class="w-[24px]" />
          <div class="min-w-[44px] lg:w-[60px]" />
        </div>
      </UiColumnHeader>
      <UiScrollerHorizontal @scroll="handleScrollEvent">
        <div class="min-w-[930px]" :class="{ 'opacity-60': isFetching }">
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
            class="flex flex-col justify-center"
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
      v-if="totalPageCount > 1"
      class="flex justify-start items-center space-x-2 px-4 py-3"
    >
      <button
        v-if="page > 1"
        type="button"
        :disabled="isFetching"
        title="First Page"
        class="text-skin-text hover:text-skin-link"
        @click="page = 1"
      >
        <IS-chevron-double-left />
      </button>
      <button
        v-if="page > 1"
        type="button"
        :disabled="isFetching"
        title="Previous Page"
        class="text-skin-text hover:text-skin-link"
        @click="page = page - 1"
      >
        <IS-chevron-left />
      </button>
      <span>
        Page
        <span class="text-skin-link font-bold mx-1" v-text="_n(page)" />
        of
        <span
          class="text-skin-link font-bold mx-1"
          v-text="_n(totalPageCount)"
        />
      </span>
      <button
        v-if="page < totalPageCount"
        type="button"
        :disabled="isFetching"
        title="Next Page"
        class="text-skin-text hover:text-skin-link"
        @click="page += 1"
      >
        <IS-chevron-right />
      </button>
      <button
        v-if="page < totalPageCount"
        type="button"
        :disabled="isFetching"
        title="Last Page"
        class="text-skin-text hover:text-skin-link"
        @click="page = totalPageCount"
      >
        <IS-chevron-double-right />
      </button>
    </div>
  </div>
</template>
