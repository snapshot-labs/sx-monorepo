<script lang="ts" setup>
import { formatUnits } from 'ethers';
import { AuctionNetworkId } from '@/helpers/auction';
import metadata from '@/helpers/auction/metadata.json';
import { AuctionWithMetadata } from '@/helpers/auction/types';
import { _d, _n, _p } from '@/helpers/utils';

const route = useRoute();
const router = useRouter();

const auction = computed<AuctionWithMetadata>(() => {
  return metadata[route.params['id'] as string] || null;
});

watchEffect(() => {
  if (auction.value.id) {
    router.push({
      name: 'auction-overview',
      params: { id: `${auction.value.network}:${auction.value.id}` }
    });
  }
});
</script>

<template>
  <UiContainer class="pt-5 !max-w-[730px] mx-0 md:mx-auto">
    <div v-if="auction" class="space-y-4">
      <div class="flex gap-3">
        <UiBadgeNetwork :id="auction.network" :size="24">
          <UiImagePreview
            v-if="auction.image_url"
            :src="auction.image_url"
            :width="64"
            :height="64"
            alt=""
            class="rounded-full"
          />
          <UiStamp
            v-else
            :id="auction.addressAuctioningToken"
            :size="64"
            type="token"
            class="rounded-full"
          />
        </UiBadgeNetwork>
        <div class="flex flex-col">
          <h1 class="text-[24px]">{{ auction.symbolAuctioningToken }}</h1>
          <AuctionStatus class="max-w-fit" :state="'upcoming'" />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-8">
        <AuctionCounter
          :title="'Minimum funding'"
          :symbol="auction.symbolBiddingToken"
          :amount="`${_n(
            parseFloat(
              formatUnits(
                auction.minFundingThreshold,
                Number(auction.decimalsBiddingToken)
              )
            ),
            'compact'
          )}`"
          :subamount="''"
        />
        <AuctionCounter
          :title="'Total auctioned'"
          :symbol="auction.symbolAuctioningToken"
          :amount="`${_n(
            parseFloat(
              formatUnits(
                auction.exactOrder.sellAmount,
                Number(auction.decimalsAuctioningToken)
              )
            ),
            'compact'
          )}`"
          :subamount="`(${_p(auction.soldSupplyPercentage)} of supply)`"
        />
        <AuctionCounter
          :title="'Duration'"
          :symbol="''"
          :amount="`${_d(parseInt(auction.endTimeTimestamp) - parseInt(auction.startingTimeStamp))}`"
          :subamount="''"
        />
      </div>

      <div
        class="items-center flex flex-col border rounded-md py-3 px-4 gap-2 bg-skin-border"
      >
        <UiEyebrow>Starting in</UiEyebrow>
        <UiCountdown :timestamp="parseInt(auction.startingTimeStamp)" />
      </div>

      <div class="space-y-2">
        <UiEyebrow>Referrals</UiEyebrow>
        <div class="border rounded-md">
          <FormAuctionReferral :network="auction.network as AuctionNetworkId" />
        </div>
      </div>
    </div>
  </UiContainer>
</template>
