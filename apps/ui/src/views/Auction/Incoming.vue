<script lang="ts" setup>
import { formatUnits } from 'ethers';
import metadata from '@/helpers/auction/metadata.json';
import { _d, _p, _rt } from '@/helpers/utils';

const route = useRoute();

const id = computed(() => route.params['id'] as string);

const auction = computed(() => {
  return metadata[id.value] || null;
});
</script>

<template>
  <div v-if="auction" class="flex">
    <div class="grow p-4">
      <dl>
        <dt>Referral ID</dt>
        <dd>{{ id }}</dd>
        <dt>Auction start date</dt>
        <dd>{{ _rt(Number(auction.startingTimeStamp)) }}</dd>
        <dt>Auction duration</dt>
        <dd>{{ _d(auction.endTimeTimestamp - auction.startingTimeStamp) }}</dd>
        <dt>Raising</dt>
        <dd>
          {{
            parseFloat(
              formatUnits(
                auction.exactOrder.sellAmount,
                auction.decimalsAuctioningToken
              )
            )
          }}
          {{ auction.symbolAuctioningToken }} ({{
            _p(auction.soldSupplyPercentage)
          }}
          of supply)
        </dd>
        <dt>Minimum funding threshold</dt>
        <dd>
          {{
            parseFloat(
              formatUnits(
                auction.minFundingThreshold,
                auction.decimalsAuctioningToken
              )
            )
          }}
          {{ auction.symbolAuctioningToken }}
        </dd>
      </dl>

      <UiButton
        v-if="auction.auctionId"
        class="mt-4"
        :to="{ name: 'auction-overview', params: { id: auction.auctionId } }"
        primary
      >
        Join auction
      </UiButton>
    </div>
    <div
      class="w-full max-w-[400px] md:h-full z-40 border-l-0 md:border-l bg-skin-bg"
    >
      Leaderboard
    </div>
  </div>
</template>
