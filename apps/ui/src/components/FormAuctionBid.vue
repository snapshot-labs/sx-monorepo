<script setup lang="ts">
import { Contract } from '@ethersproject/contracts';
import { formatUnits } from '@ethersproject/units';
import { useQuery } from '@tanstack/vue-query';
import { abis } from '@/helpers/abis';
import { AuctionNetworkId, Order, SellOrder } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { getOrderBuyAmount } from '@/helpers/auction/orders';
import { CHAIN_IDS } from '@/helpers/constants';
import { getProvider } from '@/helpers/provider';
import { parseUnits } from '@/helpers/token';
import { _n, _p, _t } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const DEFAULT_PRICE_PREMIUM = 1.001; // 0.1% above clearing price
const AMOUNT_DECIMALS = 4;

const AMOUNT_DEFINITION = {
  type: 'string',
  format: 'ethValue',
  title: 'Amount to bid',
  tooltip: 'The total amount of tokens you want to use for this bid',
  examples: ['0.0']
};

const emit = defineEmits<{
  (e: 'submit', payload: SellOrder): void;
}>();

const props = defineProps<{
  auction: AuctionDetailFragment;
  biddingTokenPrice: number;
  totalSupply: bigint;
  network: AuctionNetworkId;
  previousOrders?: Order[];
  isLoading?: boolean;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();

const bidAmount = ref('');
const bidPrice = ref('');
const bidFdv = ref('');
const sliderValue = ref(95);

const provider = computed(() => getProvider(Number(CHAIN_IDS[props.network])));

const formValidator = computed(() =>
  getValidator({
    type: 'object',
    additionalProperties: false,
    properties: {
      amount: AMOUNT_DEFINITION,
      price: AMOUNT_DEFINITION
    }
  })
);

const formatErrors = computed(() =>
  formValidator.value.validate({
    amount: bidAmount.value,
    price: bidPrice.value
  })
);

const priceUnit = computed(
  () =>
    `${props.auction.symbolBiddingToken} per ${props.auction.symbolAuctioningToken}`
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

const formattedBalance = computed(() => {
  if (!userBalance.value) return 0;
  return parseFloat(
    formatUnits(userBalance.value, props.auction.decimalsBiddingToken)
  );
});

const hasBalance = computed(() => !!(web3Account.value && userBalance.value));

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
  if (minimumSellPrice && price <= minimumSellPrice) {
    return `Minimum ${_n(minimumSellPrice)} ${priceUnit.value}`;
  }

  const maxBiddingPrice = price.toFixed(
    Number(props.auction.decimalsBiddingToken)
  );

  if (
    props.previousOrders?.find(
      order =>
        parseFloat(order.price).toFixed(
          Number(props.auction.decimalsBiddingToken)
        ) === maxBiddingPrice
    )
  ) {
    return 'You already have an order at this price';
  }

  return undefined;
});

const hasErrors = computed<boolean>(() => {
  return !!(
    Object.keys(formatErrors.value).length ||
    amountError.value ||
    priceError.value
  );
});

// TODO: Replace with something that makes sense UX-wise
// and use it across the entire app.
function convertPercentageToPrice(percentage: number) {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);

  const premiumRange = clearingPrice * 0.5;
  const premiumPrice =
    clearingPrice + ((percentage - 50) / 50) * (premiumRange / 2);

  return premiumPrice;
}

function convertPriceToPercentage(price: number) {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);

  const premiumRange = clearingPrice * 0.5;
  const percentage = ((price - clearingPrice) / (premiumRange / 2)) * 50 + 50;

  return Math.min(Math.max(percentage, 0), 100);
}

function handlePlaceOrder() {
  if (hasErrors.value) return;

  const sellAmount = parseUnits(
    bidAmount.value,
    Number(props.auction.decimalsBiddingToken)
  );

  const price = parseUnits(
    bidPrice.value,
    Number(props.auction.decimalsBiddingToken)
  );

  emit('submit', {
    sellAmount,
    buyAmount: getOrderBuyAmount({
      sellAmount,
      price,
      buyAmountDecimals: BigInt(props.auction.decimalsAuctioningToken)
    })
  });
}

function handlePriceUpdate(value: string, fromSlider = false) {
  bidPrice.value = value;

  const price = parseFloat(value);
  if (!price || !props.totalSupply) {
    bidFdv.value = '';
    return;
  }

  const totalSupplyFormatted = parseFloat(
    formatUnits(props.totalSupply, props.auction.decimalsAuctioningToken)
  );

  const fdv = price * totalSupplyFormatted;

  bidFdv.value = fdv.toFixed(AMOUNT_DECIMALS);

  if (!fromSlider) {
    sliderValue.value = convertPriceToPercentage(price);
  }
}

function handleFdvUpdate(value: string) {
  bidFdv.value = value;

  const fdv = parseFloat(value);
  if (!fdv || !props.totalSupply) {
    bidPrice.value = '';
    return;
  }

  const totalSupplyFormatted = parseFloat(
    formatUnits(props.totalSupply, props.auction.decimalsAuctioningToken)
  );

  const price = fdv / totalSupplyFormatted;
  sliderValue.value = convertPriceToPercentage(price);

  bidPrice.value = price.toFixed(AMOUNT_DECIMALS);
}

function handleSliderChange(event: Event) {
  if (event.target instanceof HTMLInputElement === false) return;

  sliderValue.value = Number(event.target.value);

  const price = convertPercentageToPrice(sliderValue.value);
  handlePriceUpdate(price.toFixed(AMOUNT_DECIMALS), true);
}

onMounted(() => {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);
  if (clearingPrice <= 0) return;

  handlePriceUpdate(
    (clearingPrice * DEFAULT_PRICE_PREMIUM).toFixed(AMOUNT_DECIMALS)
  );
});
</script>

<template>
  <div>
    <div class="s-box p-4 space-y-3 pt-6">
      <div
        class="px-3 py-2 bg-skin-border rounded-lg overflow-hidden"
        :class="amountError ? 'border-skin-danger' : ''"
      >
        <div class="flex flex-col text-skin-link">
          <label
            for="bid-amount"
            class="text-[17px] truncate"
            :class="amountError ? 'text-skin-danger' : ''"
            >Spend</label
          >
          <div class="relative text-[26px]">
            <UiRawInputAmount
              id="bid-amount"
              v-model="bidAmount"
              class="bg-skin-border"
              placeholder="0.0"
              :decimals="Number(auction.decimalsBiddingToken)"
            />
            <div class="absolute top-0 right-0 ml-2 text-skin-text">
              {{ auction.symbolBiddingToken }}
            </div>
          </div>
        </div>
        <span v-if="amountError" class="text-skin-danger">{{
          amountError
        }}</span>
        <div class="relative text-[17px]">
          <div>
            ~${{
              _n(
                bidAmount ? parseFloat(bidAmount) * biddingTokenPrice : 0,
                'standard',
                {
                  maximumFractionDigits: 2
                }
              )
            }}
          </div>
          <button
            class="absolute top-0 right-0 text-skin-link"
            @click="bidAmount = String(formattedBalance)"
          >
            {{ _n(formattedBalance) }}
            {{ auction.symbolBiddingToken }}
          </button>
        </div>
      </div>
      <div
        class="px-3 py-2 bg-skin-border border rounded-lg overflow-hidden"
        :class="priceError ? 'border-skin-danger' : ''"
      >
        <div class="flex flex-col text-skin-link">
          <label
            for="bid-price"
            class="text-[17px] truncate"
            :class="priceError ? 'text-skin-danger' : ''"
          >
            Max. price per token
          </label>
          <div class="relative text-[26px]">
            <UiRawInputAmount
              id="bid-price"
              :model-value="bidPrice"
              class="bg-skin-border"
              placeholder="0.0"
              :decimals="Number(auction.decimalsBiddingToken)"
              @update:model-value="handlePriceUpdate"
            />
            <div class="absolute top-0 right-0 ml-2 text-skin-text">
              {{ auction.symbolBiddingToken }}
            </div>
          </div>
        </div>
        <span v-if="priceError" class="text-skin-danger">{{ priceError }}</span>
        <div class="text-[17px]">
          ~${{
            _n(
              bidPrice ? parseFloat(bidPrice) * biddingTokenPrice : 0,
              'standard',
              {
                maximumFractionDigits: 2
              }
            )
          }}
        </div>
        <div class="flex flex-col text-skin-link mt-2">
          <label for="bid-fdv" class="text-[17px] truncate">Max. FDV</label>
          <div class="relative text-[26px]">
            <UiRawInputAmount
              id="bid-fdv"
              :model-value="bidFdv"
              class="bg-skin-border"
              placeholder="0.0"
              :decimals="Number(auction.decimalsBiddingToken)"
              @update:model-value="handleFdvUpdate"
            />
            <div class="absolute top-0 right-0 ml-2 text-skin-text">
              {{ auction.symbolBiddingToken }}
            </div>
          </div>
        </div>
        <div class="text-[17px]">
          ~${{
            _n(
              bidFdv ? parseFloat(bidFdv) * biddingTokenPrice : 0,
              'standard',
              {
                maximumFractionDigits: 0
              }
            )
          }}
        </div>
        <div class="relative flex my-2">
          <div
            class="absolute inset-0 pointer-events-none h-fit bg-skin-text/30 rounded-full overflow-hidden"
          >
            <div
              class="flex justify-between w-full h-[7px] bg-gradient-to-r bg-no-repeat"
              :class="{
                'from-skin-success to-skin-success': sliderValue > 50,
                'from-skin-danger to-skin-danger': sliderValue <= 50
              }"
              :style="{
                backgroundSize: `${sliderValue}% 100%`
              }"
            >
              <div class="w-0 h-full"></div>
              <div class="w-[3px] bg-skin-border h-full"></div>
              <div class="w-[3px] bg-skin-border h-full"></div>
              <div class="w-[3px] bg-skin-border h-full"></div>
              <div class="w-0 bg-red-500 h-full"></div>
            </div>
          </div>
          <input
            :value="sliderValue"
            type="range"
            min="0"
            max="100"
            class="range-slider relative w-full h-[7px] appearance-none bg-transparent"
            @input="handleSliderChange"
          />
        </div>
        <div class="text-[17px]">
          {{ _p(sliderValue / 100) }} likely to pass
        </div>
      </div>
      <UiMessage
        v-if="web3Account && isBalanceError"
        type="danger"
        class="mb-3"
      >
        Failed to load balance.
      </UiMessage>

      <UiButton
        v-if="!web3Account"
        class="w-full"
        @click="modalAccountOpen = true"
      >
        Connect wallet
      </UiButton>
      <UiButton
        v-else
        primary
        class="w-full"
        :disabled="hasErrors || isLoading"
        :loading="isLoading"
        @click="handlePlaceOrder"
      >
        Place order
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

<style lang="scss">
@mixin slider-thumb {
  @apply bg-skin-link rounded-sm outline-skin-border;
  appearance: none;
  outline-width: 2px;
  outline-style: solid;
  height: 18px;
  width: 6px;
}

.range-slider::-webkit-slider-thumb {
  @include slider-thumb;
}

.range-slider::-moz-range-thumb {
  @include slider-thumb;
}
</style>
