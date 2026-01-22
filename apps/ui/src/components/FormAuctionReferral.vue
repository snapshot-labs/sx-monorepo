<script setup lang="ts">
import { isAddress } from '@ethersproject/address';
import { useQueryClient } from '@tanstack/vue-query';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { compareOrders, decodeOrder } from '@/helpers/auction/orders';
import {
  DEFAULT_AUCTION_TAG,
  REFERRAL_SHARE
} from '@/helpers/auction/referral';
import {
  _n,
  compareAddresses,
  formatAddress,
  shortenAddress,
  sleep
} from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { useBidsSummaryQuery } from '@/queries/auction';
import {
  REFERRAL_KEYS,
  usePartnerStatisticsQuery,
  useUserInviteQuery,
  useUserInvitesQuery
} from '@/queries/referral';

const ADDRESS_INPUT_DEFINITION = {
  type: 'string',
  format: 'address',
  title: 'Partner address',
  examples: ['Enter the address of who referred you'],
  showControls: false
};

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();
const { setPartner } = useAuctionActions(
  toRef(props, 'network'),
  toRef(props, 'auction')
);
const queryClient = useQueryClient();

const partnerInput = ref('');
const isModalOpen = ref(false);

const { data: userInvite, isPending: isUserInvitePending } = useUserInviteQuery(
  {
    networkId: toRef(props, 'network'),
    account: web3Account,
    auctionTag: () => DEFAULT_AUCTION_TAG
  }
);

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

const {
  data: partnerStatisticsData,
  fetchNextPage,
  hasNextPage,
  isPending: isPartnerStatisticsPending,
  isFetchingNextPage,
  isError: isPartnerStatisticsError
} = usePartnerStatisticsQuery({
  networkId: toRef(props, 'network'),
  auctionTag: () => DEFAULT_AUCTION_TAG
});

const inputError = computed(() => {
  if (!partnerInput.value) return '';

  if (!isAddress(partnerInput.value)) return 'Invalid address';

  if (
    web3Account.value &&
    compareAddresses(partnerInput.value, web3Account.value)
  ) {
    return 'You cannot refer yourself';
  }

  return '';
});

const partnerStatistics = computed(
  () => partnerStatisticsData.value?.pages.flat() ?? []
);

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

function handleSetReferral() {
  if (!web3Account.value) {
    modalAccountOpen.value = true;
    return;
  }

  isModalOpen.value = true;
}

async function handleConfirmed() {
  partnerInput.value = '';
  await sleep(5000);

  queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all });

  isModalOpen.value = false;
}
</script>

<template>
  <div class="s-box p-4 space-y-3">
    <UiLoading
      v-if="web3Account && (isUserInvitePending || isUserInvitesPending)"
      class="py-3 block"
    />

    <template v-else>
      <div
        v-if="userInvite"
        class="border rounded-lg text-[17px] bg-skin-input-bg px-3 py-2.5 flex gap-2 flex-col"
      >
        <div class="text-skin-text">Partner</div>
        <div class="flex items-center gap-3">
          <UiStamp :id="userInvite.partner" :size="24" />
          <div class="flex flex-col leading-[22px] truncate">
            <h4
              class="truncate"
              v-text="
                userInvite.partnerName || shortenAddress(userInvite.partner)
              "
            />
            <UiAddress
              :address="formatAddress(userInvite.partner)"
              class="text-[17px] text-skin-text truncate"
            />
          </div>
        </div>
      </div>

      <template v-else>
        <p class="text-skin-text text-sm">
          Set your partner to support whoever referred you. This can only be set
          once.
        </p>

        <UiInputAddress
          v-model="partnerInput"
          :definition="ADDRESS_INPUT_DEFINITION"
          :error="inputError"
        />

        <UiButton
          primary
          class="w-full"
          :disabled="!partnerInput || !!inputError"
          @click="handleSetReferral"
        >
          Set partner
        </UiButton>
      </template>

      <div v-if="web3Account && userInvites">
        <h4 class="py-2">Your rewards</h4>
        <UiLoading
          v-if="isUserInvitesPending || isUserBuyersOrdersLoading"
          class="py-3 block"
        />
        <UiStateWarning
          v-else-if="isUserInvitesError || isUserBuyersOrdersError"
          class="py-3"
        >
          Failed to load your rewards.
        </UiStateWarning>
        <div v-else>
          <div
            class="flex gap-1 items-baseline font-medium text-skin-link leading-9"
          >
            <span class="text-[32px]">
              {{ _n(rewards) }}
            </span>
            <span class="text-md">{{
              props.auction.symbolAuctioningToken
            }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>

  <teleport to="#modal">
    <ModalTransactionProgress
      :open="isModalOpen"
      :chain-id="getNetwork(props.network).chainId"
      :execute="() => setPartner(DEFAULT_AUCTION_TAG, partnerInput)"
      @confirmed="handleConfirmed"
      @close="isModalOpen = false"
      @cancelled="isModalOpen = false"
    />
  </teleport>

  <div class="border-t border-skin-border">
    <h4 class="px-4 py-2">Leaderboard</h4>

    <UiColumnHeader
      class="overflow-hidden gap-3 !top-header-height-with-offset"
    >
      <div class="flex-1 min-w-0 truncate">Referee</div>
      <div class="w-[80px] text-right truncate">Referrals</div>
    </UiColumnHeader>

    <div class="px-4">
      <UiLoading v-if="isPartnerStatisticsPending" class="py-3 block" />

      <UiStateWarning v-else-if="isPartnerStatisticsError" class="py-3">
        Failed to load leaderboard.
      </UiStateWarning>

      <UiStateWarning v-else-if="partnerStatistics.length === 0" class="py-3">
        No referees yet.
      </UiStateWarning>

      <UiContainerInfiniteScroll
        v-else
        :loading-more="isFetchingNextPage"
        @end-reached="() => hasNextPage && fetchNextPage()"
      >
        <div
          class="divide-y divide-skin-border flex flex-col justify-center border-b"
        >
          <div
            v-for="entry in partnerStatistics"
            :key="entry.id"
            class="flex items-center gap-3 py-3"
          >
            <div class="flex-1 min-w-0 flex items-center gap-3 truncate">
              <UiStamp :id="entry.partner" :size="32" />
              <div class="flex flex-col truncate">
                <h4
                  class="truncate"
                  v-text="entry.name || shortenAddress(entry.partner)"
                />
                <UiAddress
                  :address="formatAddress(entry.partner)"
                  class="text-[17px] text-skin-text truncate"
                />
              </div>
            </div>
            <div class="w-[80px] text-right">
              <h4 class="text-skin-link">{{ entry.buyer_count }}</h4>
            </div>
          </div>
        </div>
        <template #loading>
          <UiLoading class="py-3 block" />
        </template>
      </UiContainerInfiniteScroll>
    </div>
  </div>
</template>
