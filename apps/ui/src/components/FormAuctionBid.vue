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
import { getValidator } from '@/helpers/validation';

const DEFAULT_PRICE_PREMIUM = 1.001; // 0.1% above clearing price
const PRICE_DECIMALS = 4;
const INVERTED_PRICE_DECIMALS = 8;

const AMOUNT_DEFINITION = {
  type: 'string',
  format: 'ethValue',
  title: 'Amount to bid',
  tooltip: 'The total amount of tokens you want to use for this bid',
  examples: ['0.0']
};

const props = defineProps<{
  auction: AuctionDetailFragment;
  network: AuctionNetworkId;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();

const isPriceInverted = ref(false);
const bidAmount = ref('');
const bidPrice = ref('');

const provider = computed(() => getProvider(Number(CHAIN_IDS[props.network])));

const priceDefinition = computed(() => ({
  ...AMOUNT_DEFINITION,
  title: isPriceInverted.value ? 'Min bidding price' : 'Max bidding price',
  tooltip: isPriceInverted.value
    ? 'Minimum price you are willing to accept per token'
    : 'Maximum price you are willing to pay per token'
}));

const formValidator = computed(() =>
  getValidator({
    type: 'object',
    additionalProperties: false,
    properties: {
      amount: AMOUNT_DEFINITION,
      price: priceDefinition.value
    }
  })
);

const formatErrors = computed(() =>
  formValidator.value.validate({
    amount: bidAmount.value,
    price: bidPrice.value
  })
);

const priceUnit = computed(() =>
  isPriceInverted.value
    ? `${props.auction.symbolAuctioningToken} per ${props.auction.symbolBiddingToken}`
    : `${props.auction.symbolBiddingToken} per ${props.auction.symbolAuctioningToken}`
);

const canCancelOrder = computed(
  () => parseInt(props.auction.orderCancellationEndDate) > Date.now() / 1000
);

const { data: userBalance, isError: isBalanceError } = useQuery({
  queryKey: ['balance', web3Account, () => props.auction.addressBiddingToken],
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
  queryKey: ['supply', () => props.auction.addressAuctioningToken],
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

const formattedBalance = computed(() => {
  if (!userBalance.value) return 0;
  return parseFloat(
    formatUnits(userBalance.value, props.auction.decimalsBiddingToken)
  );
});

const hasBalance = computed(() => !!(web3Account.value && userBalance.value));

const maxMarketCap = computed(() => {
  const displayPrice = parseFloat(bidPrice.value) || 0;
  if (!displayPrice || !totalSupply.value) return '0';

  const decimals = isPriceInverted.value
    ? parseInt(props.auction.decimalsBiddingToken)
    : parseInt(props.auction.decimalsAuctioningToken);
  const normalizedPrice = isPriceInverted.value
    ? parseFloat((1 / displayPrice).toFixed(decimals))
    : displayPrice;

  const totalSupplyFormatted = parseFloat(
    formatUnits(totalSupply.value, props.auction.decimalsAuctioningToken)
  );

  return _n(Math.floor(totalSupplyFormatted * normalizedPrice));
});

const amountError = computed(() => {
  if (!bidAmount.value) return undefined;
  if (formatErrors.value.amount) return formatErrors.value.amount;

  const amount = parseFloat(bidAmount.value);

  const minBiddingAmount = parseFloat(
    formatUnits(
      props.auction.minimumBiddingAmountPerOrder,
      props.auction.decimalsBiddingToken
    )
  );

  if (amount <= minBiddingAmount) {
    return `Amount must be bigger than ${_n(minBiddingAmount)} ${props.auction.symbolBiddingToken}`;
  }

  if (hasBalance.value && amount > formattedBalance.value) {
    return 'Insufficient balance';
  }

  return undefined;
});

const priceError = computed(() => {
  if (!bidPrice.value) return undefined;
  if (formatErrors.value.price) return formatErrors.value.price;

  const price = parseFloat(bidPrice.value);

  const minimumSellPrice = parseFloat(props.auction.exactOrder?.price || '0');
  if (minimumSellPrice) {
    const limit = isPriceInverted.value
      ? 1 / minimumSellPrice
      : minimumSellPrice;
    const isAboveLimit = isPriceInverted.value
      ? price >= limit
      : price <= limit;

    if (isAboveLimit) {
      const limitType = isPriceInverted.value ? 'Maximum' : 'Minimum';
      return `${limitType} ${_n(limit)} ${priceUnit.value}`;
    }
  }

  return undefined;
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
  isPriceInverted.value = !isPriceInverted.value;
  if (currentPrice) {
    const decimals = isPriceInverted.value
      ? INVERTED_PRICE_DECIMALS
      : PRICE_DECIMALS;
    bidPrice.value = formatPrice(1 / currentPrice, decimals);
  }
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
        Failed to load balance or token supply.
      </UiMessage>
      <div class="relative">
        <div
          class="absolute -top-5 right-0 text-xs text-skin-text"
          :class="{ invisible: !hasBalance }"
        >
          Balance: {{ _n(formattedBalance) }}
          {{ auction.symbolBiddingToken }}
        </div>
        <div class="relative">
          <UiInputAmount
            v-model="bidAmount"
            :definition="AMOUNT_DEFINITION"
            :error="amountError"
          />
          <button
            v-if="hasBalance"
            type="button"
            class="absolute right-3 top-[18px] text-skin-link"
            @click="bidAmount = String(formattedBalance)"
          >
            max
          </button>
        </div>
      </div>

      <div class="relative">
        <UiInputAmount
          v-model="bidPrice"
          :definition="priceDefinition"
          :error="priceError"
        />
        <div class="absolute right-3 top-[18px] flex items-center gap-2">
          <div class="text-sm text-skin-text hidden sm:block">
            {{ priceUnit }}
          </div>
          <button type="button" class="text-skin-link" @click="togglePriceMode">
            <IH-switch-horizontal />
          </button>
        </div>
      </div>

      <div
        class="border rounded-lg text-[17px] bg-skin-input-bg px-3 py-2.5 flex justify-between flex-wrap"
      >
        <div class="text-skin-text">Max market cap</div>
        <div class="flex items-center gap-1 text-skin-link">
          {{ maxMarketCap }} {{ auction.symbolBiddingToken }}
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
          {{ _t(parseInt(auction.orderCancellationEndDate)) }}
        </span>
        <span v-else>Cannot be canceled once the order is placed</span>
      </div>
    </div>
  </div>
</template>
