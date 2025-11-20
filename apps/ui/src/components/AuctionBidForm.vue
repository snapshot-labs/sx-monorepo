<script setup lang="ts">
import { Contract } from '@ethersproject/contracts';
import { formatUnits } from '@ethersproject/units';
import { useQuery } from '@tanstack/vue-query';
import { abis } from '@/helpers/abis';
import { AuctionDetail } from '@/helpers/auction';
import { CHAIN_IDS } from '@/helpers/constants';
import { getProvider } from '@/helpers/provider';
import { _n, _t } from '@/helpers/utils';

const DEFAULT_PRICE_PREMIUM = 1.001; // 0.1% above clearing price
const PRICE_DECIMALS = 4;
const INVERTED_PRICE_DECIMALS = 8;

const props = defineProps<{
  auction: AuctionDetail;
  network: string;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();

const bidAmount = ref('');
const bidPrice = ref('');
const showPriceInverted = ref(false);

const provider = computed(() => getProvider(CHAIN_IDS[props.network]));

const clearingPrice = computed(() =>
  parseFloat(props.auction.currentClearingPrice)
);

const minBiddingAmount = computed(() =>
  parseFloat(
    formatUnits(
      props.auction.minimumBiddingAmountPerOrder,
      props.auction.decimalsBiddingToken
    )
  )
);

const formattedBalance = computed(() =>
  userBalance.value
    ? formatUnits(userBalance.value, props.auction.decimalsBiddingToken)
    : '0'
);

const priceLabel = computed(() =>
  showPriceInverted.value
    ? `${props.auction.symbolAuctioningToken} per ${props.auction.symbolBiddingToken}`
    : `${props.auction.symbolBiddingToken} per ${props.auction.symbolAuctioningToken}`
);

const maxMarketCap = computed(() => {
  const price = parseFloat(bidPrice.value);
  if (!price || !totalSupply.value) return '0';
  const supply = parseFloat(
    formatUnits(totalSupply.value, props.auction.decimalsAuctioningToken)
  );
  const pricePerToken = showPriceInverted.value ? 1 / price : price;
  return _n(supply * pricePerToken);
});

const amountError = computed(() => {
  if (!bidAmount.value) return undefined;
  const amount = parseFloat(bidAmount.value);
  if (amount <= 0) return 'Invalid amount';

  if (amount <= minBiddingAmount.value) {
    return `Minimum ${_n(minBiddingAmount.value)} ${props.auction.symbolBiddingToken}`;
  }

  if (
    web3Account.value &&
    userBalance.value &&
    amount > parseFloat(formattedBalance.value)
  ) {
    return 'Insufficient balance';
  }
  return undefined;
});

const priceError = computed(() => {
  if (!bidPrice.value) return undefined;
  const price = parseFloat(bidPrice.value);
  if (price <= 0) return 'Invalid price';

  const limit = showPriceInverted.value
    ? 1 / clearingPrice.value
    : clearingPrice.value;
  const isInvalid = showPriceInverted.value ? price >= limit : price <= limit;

  if (isInvalid) {
    return `${showPriceInverted.value ? 'Maximum' : 'Minimum'} ${_n(limit)} ${priceLabel.value}`;
  }
  return undefined;
});

const canCancelOrder = computed(
  () => parseInt(props.auction.orderCancellationEndDate) > Date.now() / 1000
);

const { data: userBalance, isError: isBalanceError } = useQuery({
  queryKey: computed(() => [
    'balance',
    web3Account.value,
    props.auction.addressBiddingToken
  ]),
  queryFn: async () => {
    if (!web3Account.value) return '0';
    return (
      await new Contract(
        props.auction.addressBiddingToken,
        abis.erc20,
        provider.value
      ).balanceOf(web3Account.value)
    ).toString();
  },
  enabled: computed(() => !!web3Account.value)
});

const { data: totalSupply, isError: isSupplyError } = useQuery({
  queryKey: computed(() => ['supply', props.auction.addressAuctioningToken]),
  queryFn: async () =>
    (
      await new Contract(
        props.auction.addressAuctioningToken,
        abis.erc20,
        provider.value
      ).totalSupply()
    ).toString()
});

onMounted(() => {
  if (clearingPrice.value > 0) {
    bidPrice.value = (clearingPrice.value * DEFAULT_PRICE_PREMIUM).toFixed(
      PRICE_DECIMALS
    );
  }
});

function togglePriceMode() {
  const price = parseFloat(bidPrice.value);
  if (price) {
    bidPrice.value = (1 / price)
      .toFixed(INVERTED_PRICE_DECIMALS)
      .replace(/\.?0+$/, '');
  }
  showPriceInverted.value = !showPriceInverted.value;
}
</script>

<template>
  <div>
    <h4 class="mb-3 eyebrow flex items-center gap-2">
      <IH-cash />
      Place bid
    </h4>

    <UiMessage
      v-if="web3Account && (isBalanceError || isSupplyError)"
      type="danger"
      class="mb-3"
    >
      Failed to load balance or token supply. Please try again.
    </UiMessage>

    <div class="border border-skin-border rounded-lg">
      <div class="px-4 py-4">
        <div class="flex justify-between items-center mb-2 text-skin-text">
          <div>Amount to bid</div>
          <div v-if="web3Account && userBalance" class="text-sm">
            Balance: {{ _n(parseFloat(formattedBalance)) }}
            {{ props.auction.symbolBiddingToken }}
          </div>
        </div>
        <div class="relative">
          <UiInputAmount
            v-model="bidAmount"
            :definition="{ type: 'number', title: '', examples: ['0.0'] }"
            :error="amountError"
          />
          <button
            v-if="web3Account && userBalance"
            type="button"
            class="absolute top-[2px] right-3 h-[46px] flex items-center text-skin-link hover:text-skin-link-hover"
            @click="bidAmount = formattedBalance"
          >
            max
          </button>
        </div>

        <div class="mb-2 text-skin-text">
          {{ showPriceInverted ? 'Min bidding price' : 'Max bidding price' }}
        </div>
        <div class="relative">
          <UiInputAmount
            v-model="bidPrice"
            :definition="{ type: 'number', title: '', examples: ['0.0'] }"
            :error="priceError"
          />
          <div
            class="absolute top-[2px] right-3 h-[46px] flex items-center gap-2"
          >
            <div class="text-sm text-skin-text">{{ priceLabel }}</div>
            <button
              type="button"
              class="text-skin-link hover:text-skin-link-hover"
              title="Switch price mode"
              @click="togglePriceMode"
            >
              <IH-switch-horizontal class="inline-block" />
            </button>
          </div>
        </div>
        <div class="border rounded-lg text-[17px] bg-skin-input-bg px-3 py-2.5">
          <div class="flex justify-between">
            <div>Max market cap</div>
            <div class="flex items-center gap-1 text-skin-heading">
              <UiStamp
                :id="props.auction.addressBiddingToken"
                :size="18"
                type="token"
              />
              {{ maxMarketCap }} {{ props.auction.symbolBiddingToken }}
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-3">
        <UiButton
          v-if="!web3Account"
          class="w-full"
          @click="modalAccountOpen = true"
        >
          Connect wallet
        </UiButton>
        <UiButton v-else class="w-full" disabled>
          Place order (Coming soon)
        </UiButton>
        <div
          class="text-xs text-center mt-2.5 flex items-center justify-center gap-1.5"
        >
          <IH-information-circle class="inline-block shrink-0" :size="16" />
          <span v-if="canCancelOrder">
            Can cancel until
            {{ _t(parseInt(props.auction.orderCancellationEndDate)) }}
          </span>
          <span v-else> Cannot be canceled once the order is placed </span>
        </div>
      </div>
    </div>
  </div>
</template>
