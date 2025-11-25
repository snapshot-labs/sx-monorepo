<script setup lang="ts">
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { AuctionNetworkId, formatPrice, getOrders } from '@/helpers/auction';
import {
  AuctionDetailFragment,
  OrderDetailFragment
} from '@/helpers/auction/gql/graphql';
import { getTokenPrices } from '@/helpers/coingecko';
import { CHAIN_IDS, COINGECKO_ASSET_PLATFORMS } from '@/helpers/constants';
import { _c, _n, _p, _t, shortenAddress } from '@/helpers/utils';

const LIMIT = 20;

const props = defineProps<{
  network: AuctionNetworkId;
  auctionId: string;
  auction: AuctionDetailFragment;
}>();

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isFetchingNextPage,
  isError
} = useInfiniteQuery({
  initialPageParam: 0,
  queryKey: ['auction', () => props.network, () => props.auctionId, 'orders'],
  queryFn: ({ pageParam }) =>
    getOrders(props.auctionId, props.network, {
      first: LIMIT,
      skip: pageParam
    }),
  getNextPageParam: (lastPage, pages) => {
    if (lastPage.length < LIMIT) return null;

    return pages.length * LIMIT;
  }
});

const { data: biddingTokenPrice, isLoading: isBiddingTokenPriceLoading } =
  useQuery({
    queryKey: [
      'auction',
      () => props.network,
      () => props.auctionId,
      'pricing'
    ],
    queryFn: async () => {
      const chainId = CHAIN_IDS[props.network];
      if (!(chainId in COINGECKO_ASSET_PLATFORMS)) {
        return 0;
      }

      const coingeckoAssetPlatform =
        COINGECKO_ASSET_PLATFORMS[
          chainId as keyof typeof COINGECKO_ASSET_PLATFORMS
        ];

      const coins = await getTokenPrices(coingeckoAssetPlatform, [
        props.auction.addressBiddingToken
      ]);

      return (
        coins[props.auction.addressBiddingToken.toLocaleLowerCase()]?.usd ?? 0
      );
    }
  });

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

function getOrderPercentage(order: OrderDetailFragment) {
  return Number(order.buyAmount) / Number(props.auction.exactOrder.sellAmount);
}
</script>

<template>
  <div>
    <UiSectionHeader label="Bids" sticky />
    <UiColumnHeader class="z-40 overflow-hidden gap-3">
      <div class="flex-1 min-w-12 truncate">Bidder</div>
      <div class="max-w-[168px] w-[168px] truncate">Date</div>
      <div class="max-w-[168px] w-[168px] truncate">Amount</div>
      <div class="max-w-[168px] w-[168px] text-right truncate">Price</div>
    </UiColumnHeader>
    <UiLoading
      v-if="isPending || isBiddingTokenPriceLoading"
      class="px-4 py-3 block"
    />
    <UiStateWarning v-else-if="isError" class="px-4 py-3">
      Failed to load bids.
    </UiStateWarning>
    <UiStateWarning
      v-else-if="data?.pages.flat().length === 0"
      class="px-4 py-3"
    >
      There are no bids here.
    </UiStateWarning>
    <UiContainerInfiniteScroll
      v-else-if="data && typeof biddingTokenPrice === 'number'"
      :loading-more="isFetchingNextPage"
      @end-reached="handleEndReached"
    >
      <template #loading>
        <UiLoading class="px-4 py-3 block" />
      </template>
      <div
        class="divide-y divide-skin-border flex flex-col justify-center border-b"
      >
        <div
          v-for="order in data?.pages.flat()"
          :key="order.id"
          class="flex justify-between items-center gap-3 py-3 px-4 relative"
        >
          <div
            class="right-0 top-0 h-[8px] absolute choice-bg opacity-20 _1"
            :style="{
              width: `${Math.min(getOrderPercentage(order) * 100, 100).toFixed(2)}%`
            }"
          />
          <div
            class="leading-[22px] flex-1 flex min-w-12 items-center space-x-3 truncate"
          >
            <UiStamp :id="order.userAddress" :size="32" />
            <div class="flex flex-col truncate">
              <h4
                class="truncate"
                v-text="order.name || shortenAddress(order.userAddress)"
              />
              <UiAddress
                :address="order.userAddress"
                class="text-[17px] text-skin-text truncate"
              />
            </div>
          </div>
          <div
            class="leading-[22px] max-w-[168px] w-[168px] flex flex-col justify-center truncate"
          >
            <TimeRelative
              v-slot="{ relativeTime }"
              :time="Number(order.timestamp)"
            >
              <h4>{{ relativeTime }}</h4>
            </TimeRelative>
            <div class="text-[17px]">
              {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
            </div>
          </div>
          <div class="max-w-[168px] w-[168px] truncate">
            <h4 class="text-skin-link truncate">
              {{ _c(order.buyAmount, Number(auction.decimalsAuctioningToken)) }}
              {{ auction.symbolAuctioningToken }}
            </h4>
            <div class="text-[17px] truncate">
              {{ _p(getOrderPercentage(order)) }}
            </div>
          </div>
          <div class="max-w-[168px] w-[168px] truncate text-right">
            <h4 class="text-skin-link truncate">
              {{ formatPrice(order.price) }}
              {{ auction.symbolBiddingToken }}
            </h4>
            <div class="truncate">
              ${{
                _n(Number(order.price) * biddingTokenPrice, 'standard', {
                  maximumFractionDigits: 2
                })
              }}
            </div>
          </div>
        </div>
      </div>
    </UiContainerInfiniteScroll>
  </div>
</template>
