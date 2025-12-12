<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _n, _t, shortenAddress } from '@/helpers/utils';

const props = defineProps<{
  auctionId: string;
  auction: AuctionDetailFragment;
  order: Order;
  biddingTokenPrice: number;
  totalSupply: bigint;
}>();

const amountValue = computed(
  () =>
    (Number(props.order.sellAmount) /
      10 ** Number(props.auction.decimalsBiddingToken)) *
    props.biddingTokenPrice
);

const priceValue = computed(
  () => Number(props.order.price) * props.biddingTokenPrice
);

const fdv = computed(
  () =>
    Number(props.order.price) *
    Number(
      props.totalSupply / 10n ** BigInt(props.auction.decimalsAuctioningToken)
    )
);

const fdvValue = computed(() => fdv.value * props.biddingTokenPrice);
</script>

<template>
  <div class="flex justify-between items-center gap-3 py-3 px-4 leading-[22px]">
    <div class="flex-1 min-w-[168px] truncate">
      <AppLink
        class="w-fit flex items-center space-x-3 truncate"
        :to="{ name: 'user', params: { user: order.userAddress } }"
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
      </AppLink>
    </div>
    <div class="w-[200px] max-w-[200px] flex flex-col justify-center truncate">
      <TimeRelative v-slot="{ relativeTime }" :time="Number(order.timestamp)">
        <h4>{{ relativeTime }}</h4>
      </TimeRelative>
      <div class="text-[17px]">
        {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
      </div>
    </div>
    <div class="w-[200px] max-w-[200px] truncate">
      <h4 class="text-skin-link truncate">
        {{ _c(order.sellAmount, Number(auction.decimalsBiddingToken)) }}
        {{ auction.symbolBiddingToken }}
      </h4>
      <div class="text-[17px] truncate">
        ${{
          _n(amountValue, 'standard', {
            maximumFractionDigits: 2
          })
        }}
      </div>
    </div>
    <div class="w-[200px] max-w-[200px] truncate">
      <h4 class="text-skin-link truncate">
        {{ formatPrice(order.price) }}
        {{ auction.symbolBiddingToken }}
      </h4>
      <div class="text-[17px] truncate">
        ${{
          _n(priceValue, 'standard', {
            maximumFractionDigits: 2
          })
        }}
      </div>
    </div>
    <div class="w-[200px] max-w-[200px] truncate">
      <h4 class="text-skin-link truncate">
        {{ _n(fdv, 'compact') }}
        {{ auction.symbolBiddingToken }}
      </h4>
      <div class="text-[17px] truncate">
        ${{
          _n(fdvValue, 'standard', {
            maximumFractionDigits: 2
          })
        }}
      </div>
    </div>
    <div class="w-[200px] max-w-[200px] text-skin-success truncate">Active</div>
    <div
      class="min-w-[44px] lg:w-[60px] flex items-center justify-center -mr-4"
    >
      <UiDropdown>
        <template #button>
          <button type="button">
            <IH-dots-horizontal class="text-skin-link" />
          </button>
        </template>
        <template #items>
          <UiDropdownItem disabled>
            <IH-arrow-sm-right class="-rotate-45" :width="16" />
            View on block explorer
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
  </div>
</template>
