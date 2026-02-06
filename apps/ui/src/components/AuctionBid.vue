<script setup lang="ts">
import { formatPrice, Order } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { _c, _n, _t, shortenAddress } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const props = defineProps<{
  networkId: NetworkID;
  auctionId: string;
  auction: AuctionDetailFragment;
  order: Order;
  biddingTokenPrice: number;
  totalSupply: bigint;
}>();

const network = computed(() => getNetwork(props.networkId));

const amountValue = computed(
  () =>
    (Number(props.order.sellAmount) /
      10 ** Number(props.auction.decimalsBiddingToken)) *
    props.biddingTokenPrice
);

const priceValue = computed(
  () => Number(props.order.price) * props.biddingTokenPrice
);
</script>

<template>
  <div
    class="flex items-center gap-3 py-3 px-4 leading-[22px] border-b border-skin-border"
  >
    <div class="w-[260px] max-w-[260px] truncate">
      <div class="flex items-center space-x-3 truncate">
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
    <div class="w-[200px] max-w-[200px] flex flex-col justify-center truncate">
      <TimeRelative v-slot="{ relativeTime }" :time="Number(order.timestamp)">
        <h4>{{ relativeTime }}</h4>
      </TimeRelative>
      <div class="text-[17px]">
        {{ _t(Number(order.timestamp), 'MMM D, YYYY') }}
      </div>
    </div>
    <div class="w-[24px] flex items-center">
      <UiTooltip title="Active">
        <span class="inline-block w-2 h-2 rounded-full bg-skin-success" />
      </UiTooltip>
    </div>
    <div class="min-w-[44px] lg:w-[60px] flex mt-1 items-center justify-center">
      <UiDropdown>
        <template #button>
          <button type="button">
            <IH-dots-horizontal class="text-skin-link" />
          </button>
        </template>
        <template #items>
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
