<script setup lang="ts">
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { DEFAULT_AUCTION_TAG } from '@/helpers/auction/referral';
import { formatAddress, shortenAddress } from '@/helpers/utils';
import { usePartnerStatisticsQuery } from '@/queries/referral';

const props = defineProps<{
  network: AuctionNetworkId;
  auction?: AuctionDetailFragment;
}>();

const { web3Account } = useWeb3();

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

const partnerStatistics = computed(
  () => partnerStatisticsData.value?.pages.flat() ?? []
);
</script>

<template>
  <div class="divide-y divide-skin-border">
    <ReferralReward
      v-if="web3Account && auction"
      :network="network"
      :auction="auction"
      class="p-4"
    />

    <div>
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
          <div class="divide-y divide-skin-border flex flex-col justify-center">
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
  </div>
</template>
