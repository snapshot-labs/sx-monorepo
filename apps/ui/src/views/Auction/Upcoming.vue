<script lang="ts" setup>
import { formatUnits } from 'ethers';
import { AuctionNetworkId } from '@/helpers/auction';
import metadata from '@/helpers/auction/metadata.json';
import { _d, _n, _p, partitionDuration } from '@/helpers/utils';

const route = useRoute();
const router = useRouter();
const currentTimestamp = useTimestamp({ interval: 1000 });

const id = computed(() => route.params['id'] as string);

const auction = computed(() => {
  return metadata[id.value] || null;
});

const countdown = computed(() => {
  const currentTimestampSeconds = Math.floor(currentTimestamp.value / 1000);

  if (auction.value.startTimestamp < currentTimestampSeconds) {
    return null;
  }

  const diff = parseInt(auction.value.startTimestamp) - currentTimestampSeconds;

  return partitionDuration(diff);
});

watchEffect(() => {
  if (auction.value.auctionId) {
    router.push({
      name: 'auction-overview',
      params: { id: `${auction.value.network}:${auction.value.auctionId}` }
    });
  }
});
</script>

<template>
  <UiContainer class="pt-5 !max-w-[730px] mx-0 md:mx-auto">
    <div v-if="auction" class="space-y-4">
      <div class="flex gap-3">
        <UiBadgeNetwork :id="auction.network" :size="24">
          <UiStamp
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
                auction.decimalsBiddingToken
              )
            ),
            'compact'
          )}`"
          :subamount="''"
        />
        <AuctionCounter
          :title="'Raising target'"
          :symbol="auction.symbolAuctioningToken"
          :amount="`${_n(
            parseFloat(
              formatUnits(
                auction.auctionedSellAmount,
                auction.decimalsAuctioningToken
              )
            ),
            'compact'
          )}`"
          :subamount="`(${_p(auction.soldSupplyPercentage)} of supply)`"
        />
        <AuctionCounter
          :title="'Duration'"
          :symbol="''"
          :amount="`${_d(auction.duration)}`"
          :subamount="``"
        />
      </div>

      <div
        class="items-center flex flex-col border rounded-md py-3 px-4 gap-2 bg-skin-border"
      >
        <UiEyebrow>Starting in</UiEyebrow>

        <div class="flex justify-between gap-3">
          <div v-if="countdown" class="flex gap-3.5">
            <div
              v-if="countdown.days > 0"
              class="flex flex-col items-center uppercase min-w-6"
            >
              <span class="text-[32px] tracking-wider text-rose-500">
                {{ String(countdown.days).padStart(2, '0') }}
              </span>
              <span>days</span>
            </div>
            <div class="flex flex-col items-center uppercase min-w-6">
              <span class="text-[32px] tracking-wider text-rose-500">
                {{ String(countdown.hours).padStart(2, '0') }}
              </span>
              <span>hrs.</span>
            </div>
            <div class="flex flex-col items-center uppercase min-w-6">
              <span class="text-[32px] tracking-wider text-rose-500">
                {{ String(countdown.minutes).padStart(2, '0') }}
              </span>
              <span>min.</span>
            </div>
            <div class="flex flex-col items-center uppercase min-w-6">
              <span class="text-[32px] tracking-wider text-rose-500">
                {{ String(countdown.seconds).padStart(2, '0') }}
              </span>
              <span>sec.</span>
            </div>
          </div>
        </div>
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
