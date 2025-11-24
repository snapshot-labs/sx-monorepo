<script setup lang="ts">
import { Contract } from '@ethersproject/contracts';
import { formatUnits } from '@ethersproject/units';
import { useQuery } from '@tanstack/vue-query';
import { abis } from '@/helpers/abis';
import { AuctionNetworkId, formatPrice } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { CHAIN_IDS } from '@/helpers/constants';
import { getProvider } from '@/helpers/provider';
import { _n, _t } from '@/helpers/utils';

const DEFAULT_PRICE_PREMIUM = 1.001; // 0.1% above clearing price
const PRICE_DECIMALS = 4;
const INVERTED_PRICE_DECIMALS = 8;

const inputDefinition = {
  type: 'string',
  examples: ['0.0']
};

const props = defineProps<{
  auction: AuctionDetailFragment;
  network: AuctionNetworkId;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();

const bidAmount = ref('');
const bidPrice = ref('');
const showPriceInverted = ref(false);

const provider = computed(() => getProvider(Number(CHAIN_IDS[props.network])));

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
  const price = parseFloat(bidPrice.value) || 0;
  if (!price || !totalSupply.value) return '0';

  const totalSupplyFormatted = parseFloat(
    formatUnits(totalSupply.value, props.auction.decimalsAuctioningToken)
  );
  const pricePerToken = showPriceInverted.value ? 1 / price : price;
  const marketCapValue = Math.floor(totalSupplyFormatted * pricePerToken);

  return _n(marketCapValue);
});

const amountError = computed(() => {
  if (!bidAmount.value) return undefined;

  const amount = parseFloat(bidAmount.value);
  if (amount <= 0) return 'Invalid amount';

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

  const price = parseFloat(bidPrice.value) || 0;
  if (price <= 0) return 'Invalid price';

  const minimumSellPrice = parseFloat(props.auction.exactOrder?.price || '0');
  const limit = showPriceInverted.value
    ? 1 / minimumSellPrice
    : minimumSellPrice;
  const isAboveLimit = showPriceInverted.value
    ? price >= limit
    : price <= limit;

  if (isAboveLimit) {
    const limitType = showPriceInverted.value ? 'Maximum' : 'Minimum';
    return `${limitType} ${_n(limit)} ${priceLabel.value}`;
  }

  return undefined;
});

const canCancelOrder = computed(
  () => parseInt(props.auction.orderCancellationEndDate) > Date.now() / 1000
);

const { data: userBalance, isError: isBalanceError } = useQuery({
  queryKey: ['balance', web3Account, props.auction.addressBiddingToken],
  queryFn: async () => {
    if (!web3Account.value) return '0';

    const contract = new Contract(
      props.auction.addressBiddingToken,
      abis.erc20,
      provider.value
    );

    const balance = await contract.balanceOf(web3Account.value);

    return balance.toString();
  },
  enabled: computed(() => !!web3Account.value)
});

const { data: totalSupply, isError: isSupplyError } = useQuery({
  queryKey: ['supply', props.auction.addressAuctioningToken],
  queryFn: async () => {
    const contract = new Contract(
      props.auction.addressAuctioningToken,
      abis.erc20,
      provider.value
    );

    const totalSupply = await contract.totalSupply();

    return totalSupply.toString();
  }
});

onMounted(() => {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);
  if (clearingPrice <= 0) return;

  bidPrice.value = (clearingPrice * DEFAULT_PRICE_PREMIUM).toFixed(
    PRICE_DECIMALS
  );
});

function togglePriceMode() {
  const currentPrice = parseFloat(bidPrice.value) || 0;
  if (!currentPrice) return;

  const invertedPrice = 1 / currentPrice;
  bidPrice.value = formatPrice(invertedPrice, INVERTED_PRICE_DECIMALS);
  showPriceInverted.value = !showPriceInverted.value;
}
</script>

<template>
  <div>
    <h4 class="mb-3 eyebrow flex items-center gap-2">
      <IH-cash />
      Place bid
    </h4>

    <div class="border border-skin-border rounded-lg s-box p-4 space-y-3 pt-6">
      <UiMessage
        v-if="web3Account && (isBalanceError || isSupplyError)"
        type="danger"
        class="mb-3"
      >
        Failed to load balance or token supply. Please try again.
      </UiMessage>
      <div class="relative">
        <div
          class="absolute -top-5 right-0 text-xs text-skin-text"
          :class="{ invisible: !(web3Account && userBalance) }"
        >
          Balance: {{ _n(parseFloat(formattedBalance)) }}
          {{ props.auction.symbolBiddingToken }}
        </div>
        <div class="relative">
          <UiInputAmount
            v-model="bidAmount"
            :definition="{ ...inputDefinition, title: 'Amount to bid' }"
            :error="amountError"
          />
          <button
            v-if="web3Account && userBalance"
            type="button"
            class="absolute right-3 top-[18px] text-skin-link"
            @click="bidAmount = formattedBalance"
          >
            max
          </button>
        </div>
      </div>

      <div class="relative">
        <UiInputAmount
          v-model="bidPrice"
          :definition="{
            ...inputDefinition,
            title: showPriceInverted ? 'Min bidding price' : 'Max bidding price'
          }"
          :error="priceError"
        />
        <div class="absolute right-3 top-[18px] flex items-center gap-2">
          <div class="text-sm text-skin-text hidden sm:block">
            {{ priceLabel }}
          </div>
          <button type="button" class="text-skin-link" @click="togglePriceMode">
            <IH-switch-horizontal />
          </button>
        </div>
      </div>

      <div class="border rounded-lg text-[17px] bg-skin-input-bg px-3 py-2.5">
        <div class="flex justify-between">
          <div class="text-skin-text">Max market cap</div>
          <div class="flex items-center gap-1 text-skin-link">
            <UiStamp
              :id="props.auction.addressBiddingToken"
              :size="18"
              type="token"
            />
            {{ maxMarketCap }} {{ props.auction.symbolBiddingToken }}
          </div>
        </div>
      </div>

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
      <div class="text-xs text-center flex items-center justify-center gap-1.5">
        <IH-information-circle class="inline-block shrink-0" :size="16" />
        <span v-if="canCancelOrder">
          Can cancel until
          {{ _t(parseInt(props.auction.orderCancellationEndDate)) }}
        </span>
        <span v-else> Cannot be canceled once the order is placed </span>
      </div>
    </div>
  </div>
</template>
