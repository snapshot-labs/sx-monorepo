<script setup lang="ts">
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { compareOrders, decodeOrder } from '@/helpers/auction/orders';
import {
  DEFAULT_AUCTION_TAG,
  REFERRAL_SHARE
} from '@/helpers/auction/referral';
import { _n } from '@/helpers/utils';
import { useBidsSummaryQuery } from '@/queries/auction';
import { useUserInvitesQuery } from '@/queries/referral';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const { web3Account } = useWeb3();

const {
  data: userInvites,
  isError: isUserInvitesError,
  isPending: isUserInvitesPending
} = useUserInvitesQuery({
  networkId: toRef(props, 'network'),
  account: web3Account,
  auctionTag: () => DEFAULT_AUCTION_TAG
});

const {
  data: userBuyersOrders,
  isError: isUserBuyersOrdersError,
  isLoading: isUserBuyersOrdersLoading
} = useBidsSummaryQuery({
  network: () => props.network,
  auction: () => props.auction,
  where: () => ({
    userAddress_in: userInvites.value?.map(r => r.buyer.toLowerCase()) ?? []
  }),
  orderBy: 'price',
  orderDirection: 'desc',
  enabled: () =>
    web3Account.value !== null &&
    !!userInvites.value &&
    userInvites.value.length > 0
});

const userBuyersOrdersTotal = computed(() => {
  let totalVolume = 0n;

  const clearingPriceOrderDecoded = props.auction.clearingPriceOrder
    ? decodeOrder(props.auction.clearingPriceOrder)
    : null;

  for (const order of userBuyersOrders.value ?? []) {
    const orderComparison = compareOrders(
      {
        userId: order.userId,
        buyAmount: order.buyAmount,
        sellAmount: order.sellAmount
      },
      // Until auction is cleared we are missing userId for clearing price order.
      // If our referee has order with the same price, buyAmount and sellAmount as the (last) clearing order
      // it might be or not be included in the total.
      // This might not be a huge deal as for open auctions last clearing order might be changing often.
      clearingPriceOrderDecoded ?? {
        userId: order.userId,
        buyAmount: props.auction.currentClearingOrderBuyAmount,
        sellAmount: props.auction.currentClearingOrderSellAmount
      }
    );

    if (orderComparison > 0) {
      totalVolume += BigInt(order.sellAmount);
    } else if (orderComparison === 0) {
      totalVolume += BigInt(props.auction.currentVolume);
    }
  }

  return totalVolume;
});

const rewards = computed(() => {
  const sellAmountShare =
    (REFERRAL_SHARE * Number(userBuyersOrdersTotal.value)) /
    10 ** Number(props.auction.decimalsBiddingToken);

  return sellAmountShare * Number(props.auction.currentClearingPrice);
});
</script>

<template>
  <div>
    <h4 class="pb-2">Your rewards</h4>
    <UiLoading
      v-if="isUserInvitesPending || isUserBuyersOrdersLoading"
      class="py-2 block"
    />
    <UiStateWarning
      v-else-if="isUserInvitesError || isUserBuyersOrdersError"
      class="py-2"
    >
      Failed to load your rewards.
    </UiStateWarning>
    <div
      v-else
      class="flex gap-1 items-baseline font-medium text-skin-link leading-9"
    >
      <span class="text-[32px]">
        {{ _n(rewards) }}
      </span>
      <span class="text-md">{{ props.auction.symbolAuctioningToken }}</span>
    </div>
  </div>
</template>
