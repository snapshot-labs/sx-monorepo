<script setup lang="ts">
import { getAddress } from '@ethersproject/address';
import { formatUnits } from '@ethersproject/units';
import { useQuery } from '@tanstack/vue-query';
import { getAuction } from '@/helpers/auction';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n, _t } from '@/helpers/utils';
import { METADATA as EVM_METADATA } from '@/networks/evm';

const route = useRoute();

const params = computed(() => {
  const [network = 'sep', id = ''] =
    route.params.id?.toString().split(':') || [];
  return { network, id };
});

const {
  data: auctionData,
  isLoading,
  error
} = useQuery({
  queryKey: computed(() => ['auction', params.value.network, params.value.id]),
  queryFn: () => getAuction(params.value.id, params.value.network),
  enabled: computed(() => !!params.value.id)
});

const formatTokenAmount = (amount: string | undefined, decimals: string) =>
  amount ? _n(parseFloat(formatUnits(amount, decimals))) : '0';

const formatPrice = (price: string | undefined) =>
  price
    ? parseFloat(price)
        .toFixed(8)
        .replace(/\.?0+$/, '')
    : '0';

const biddingParameters = computed(() => {
  const auction = auctionData.value?.auctionDetail;
  if (!auction) return [];
  const {
    symbolBiddingToken: symbol,
    decimalsBiddingToken,
    currentClearingPrice,
    exactOrder,
    minimumBiddingAmountPerOrder
  } = auction;
  return [
    {
      label: 'Current price',
      value: `${formatPrice(currentClearingPrice)} ${symbol}`
    },
    {
      label: 'Minimum sell price',
      value: `${formatPrice(exactOrder?.price)} ${symbol}`
    },
    {
      label: 'Minimal bidding amount per order',
      value: `${formatTokenAmount(minimumBiddingAmountPerOrder, decimalsBiddingToken)} ${symbol}`
    }
  ];
});

const auctionSettings = computed(() => {
  const auction = auctionData.value?.auctionDetail;
  if (!auction) return [];
  return [
    {
      label: 'Is atomic closure allowed?',
      value: auction.isAtomicClosureAllowed ? 'Yes' : 'No'
    },
    {
      label: 'Is private auction?',
      value: auction.isPrivateAuction ? 'Yes' : 'No'
    }
  ];
});

const timelineStates = computed(() => {
  const auction = auctionData.value?.auctionDetail;
  if (!auction) return [];
  const now = Math.floor(Date.now() / 1000);
  const { startingTimeStamp, orderCancellationEndDate, endTimeTimestamp } =
    auction;
  const toTimeline = (ts: string, label: string) => ({
    label,
    value: _t(parseInt(ts)),
    timestamp: parseInt(ts),
    isPast: parseInt(ts) <= now
  });
  return [
    toTimeline(startingTimeStamp, 'Auction start date'),
    toTimeline(orderCancellationEndDate, 'Last order cancellation date'),
    toTimeline(endTimeTimestamp, 'Auction end date')
  ].sort((a, b) => a.timestamp - b.timestamp);
});

const normalizedSignerAddress = computed(() => {
  const signer = auctionData.value?.auctionDetail?.allowListSigner;
  if (!signer || signer === '0x') return null;
  return signer.length > 42 ? `0x${signer.slice(26)}` : signer;
});
</script>

<template>
  <div class="pt-5 max-w-[50rem] mx-auto px-4">
    <UiLoading v-if="isLoading" class="block p-4" />
    <UiStateWarning
      v-else-if="error || !auctionData?.auctionDetail"
      class="px-4 py-3"
    >
      {{
        error
          ? `Failed to load auction data: ${error.message}`
          : 'Auction not found'
      }}
    </UiStateWarning>
    <div v-else class="space-y-4">
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <h1 class="text-[40px] leading-10">Auction #{{ params.id }}</h1>
          <span
            class="inline-block px-2 py-1 text-xs rounded-full bg-skin-border text-skin-text"
          >
            {{ EVM_METADATA[params.network]?.name || 'Unknown' }}
          </span>
        </div>
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-collection />
          Token information
        </h4>
        <div
          class="border border-skin-border rounded-lg divide-y divide-skin-border"
        >
          <div
            class="flex flex-col sm:flex-row sm:justify-between px-4 py-3 gap-3"
          >
            <div class="flex-1">
              <div class="text-skin-text text-sm mb-2">
                Auctioning token address
              </div>
              <a
                :href="
                  getGenericExplorerUrl(
                    EVM_METADATA[params.network]?.chainId,
                    auctionData.auctionDetail.addressAuctioningToken,
                    'token'
                  ) || '#'
                "
                target="_blank"
                class="flex items-center gap-2"
              >
                <UiStamp
                  :id="auctionData.auctionDetail.addressAuctioningToken"
                  type="token"
                  :size="32"
                />
                <div class="flex flex-col leading-[22px] min-w-0">
                  <h4
                    class="truncate"
                    v-text="auctionData.auctionDetail.symbolAuctioningToken"
                  />
                  <div class="text-[17px] truncate text-skin-text">
                    <UiAddress
                      :address="
                        auctionData.auctionDetail.addressAuctioningToken
                      "
                    />
                  </div>
                </div>
              </a>
            </div>
            <div class="sm:text-right">
              <div class="text-skin-text text-sm mb-1">Total auctioned</div>
              <div class="text-skin-link text-xl">
                {{
                  formatTokenAmount(
                    auctionData.auctionDetail.exactOrder?.sellAmount,
                    auctionData.auctionDetail.decimalsAuctioningToken
                  )
                }}
                {{ auctionData.auctionDetail.symbolAuctioningToken }}
              </div>
            </div>
          </div>

          <div
            class="flex flex-col sm:flex-row sm:justify-between px-4 py-3 gap-3"
          >
            <div class="flex-1">
              <div class="text-skin-text text-sm mb-2">
                Bidding token address
              </div>
              <a
                :href="
                  getGenericExplorerUrl(
                    EVM_METADATA[params.network]?.chainId,
                    auctionData.auctionDetail.addressBiddingToken,
                    'token'
                  ) || '#'
                "
                target="_blank"
                class="flex items-center gap-2"
              >
                <UiStamp
                  :id="auctionData.auctionDetail.addressBiddingToken"
                  type="token"
                  :size="32"
                />
                <div class="flex flex-col leading-[22px] min-w-0">
                  <h4
                    class="truncate"
                    v-text="auctionData.auctionDetail.symbolBiddingToken"
                  />
                  <div class="text-[17px] truncate text-skin-text">
                    <UiAddress
                      :address="auctionData.auctionDetail.addressBiddingToken"
                    />
                  </div>
                </div>
              </a>
            </div>
            <div class="sm:text-right">
              <div class="text-skin-text text-sm mb-1">
                Minimal funding threshold
              </div>
              <div class="text-skin-link text-xl">
                {{
                  formatTokenAmount(
                    auctionData.auctionDetail.minFundingThreshold,
                    auctionData.auctionDetail.decimalsBiddingToken
                  )
                }}
                {{ auctionData.auctionDetail.symbolBiddingToken }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-currency-dollar />
          Bidding parameters
        </h4>
        <div
          class="border border-skin-border rounded-lg divide-y divide-skin-border"
        >
          <div
            v-for="item in biddingParameters"
            :key="item.label"
            class="flex justify-between px-4 py-3"
          >
            <div class="text-skin-text">{{ item.label }}</div>
            <div class="text-skin-link">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-cog />
          Auction settings
        </h4>
        <div
          class="border border-skin-border rounded-lg divide-y divide-skin-border"
        >
          <div
            v-for="item in auctionSettings"
            :key="item.label"
            class="flex justify-between px-4 py-3"
          >
            <div class="text-skin-text">{{ item.label }}</div>
            <div class="text-skin-link">{{ item.value }}</div>
          </div>
          <div class="flex justify-between px-4 py-3">
            <div class="text-skin-text">Signer address</div>
            <div class="text-skin-link">
              <a
                v-if="normalizedSignerAddress"
                :href="
                  getGenericExplorerUrl(
                    EVM_METADATA[params.network]?.chainId,
                    normalizedSignerAddress,
                    'address'
                  ) || '#'
                "
                target="_blank"
              >
                <UiAddress :address="getAddress(normalizedSignerAddress)" />
              </a>
              <span v-else>None</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-clock />
          Timeline
        </h4>
        <div class="flex">
          <div class="mt-1 ml-2">
            <div
              v-for="(state, i) in timelineStates"
              :key="state.label"
              class="flex relative h-[60px] last:h-0"
            >
              <div
                class="absolute size-[15px] inline-block rounded-full left-[-7px] border-4 border-skin-bg"
                :class="state.isPast ? 'bg-skin-heading' : 'bg-skin-border'"
              />
              <div
                v-if="i < timelineStates.length - 1"
                class="border-l pr-4 mt-3"
                :class="timelineStates[i + 1].isPast && 'border-skin-heading'"
              />
            </div>
          </div>
          <div class="flex-auto leading-6">
            <div
              v-for="state in timelineStates"
              :key="state.label"
              class="mb-3 last:mb-0 h-[44px]"
            >
              <h4 v-text="state.label" />
              <div v-text="state.value" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
