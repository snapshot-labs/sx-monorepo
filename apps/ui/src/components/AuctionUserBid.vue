<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _n, _t } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const props = defineProps<{
  networkId: NetworkID;
  auctionId: string;
  auction: AuctionDetailFragment;
  order: Order;
  orderStatus?: 'open' | 'filled' | 'partially-filled' | 'rejected' | 'claimed';
  biddingTokenPrice: number;
  totalSupply: bigint;
}>();

const emit = defineEmits<{
  (e: 'cancel', order: Order): void;
}>();

const network = computed(() => getNetwork(props.networkId));

const isCancellable = computed(() => {
  return Number(props.auction.orderCancellationEndDate) * 1000 > Date.now();
});

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
    <div class="flex-1 min-w-[110px] flex flex-col justify-center truncate">
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
    <div class="w-[200px] max-w-[200px] text-skin-link truncate">
      <span v-if="orderStatus === 'open'">Open</span>
      <span v-else-if="orderStatus === 'claimed'" class="text-skin-success">
        Claimed
      </span>
      <span v-else-if="orderStatus === 'filled'" class="text-skin-success">
        Filled
      </span>
      <span
        v-else-if="orderStatus === 'partially-filled'"
        class="text-yellow-500"
      >
        Partially-filled
      </span>
      <span v-else-if="orderStatus === 'rejected'" class="text-skin-danger">
        Rejected
      </span>
    </div>
    <div class="min-w-[44px] lg:w-[60px] flex items-center justify-center">
      <UiDropdown>
        <template #button>
          <button type="button">
            <IH-dots-horizontal class="text-skin-link" />
          </button>
        </template>
        <template #items>
          <UiDropdownItem
            :disabled="!isCancellable"
            @click="emit('cancel', order)"
          >
            <IS-x-mark :width="16" />
            Cancel bid
          </UiDropdownItem>
          <UiDropdownItem
            :to="
              network.helpers.getExplorerUrl(order.transactionId, 'transaction')
            "
          >
            <IH-arrow-sm-right class="-rotate-45" :width="16" />
            View on block explorer
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
  </div>
</template>
