<script setup lang="ts">
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { formatUnits } from '@ethersproject/units';
import { useQuery } from '@tanstack/vue-query';
import { abis } from '@/helpers/abis';
import { AuctionNetworkId, Order, SellOrder } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { getOrderBuyAmount } from '@/helpers/auction/orders';
import { CHAIN_IDS } from '@/helpers/constants';
import { removeTrailingZeroes } from '@/helpers/format';
import { getProvider } from '@/helpers/provider';
import { isWethContract, parseUnits } from '@/helpers/token';
import { _n, _p, _t } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';

const ETH_MIN_BALANCE = 0.01;
const MIN_PRICE_PREMIUM = 0.01; // 1% above minimum price
const AMOUNT_DECIMALS = 6;

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
  biddingTokenPrice?: number;
  totalSupply: bigint;
  network: AuctionNetworkId;
  previousOrders?: Order[];
  isLoading?: boolean;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();

const {
  verificationType,
  status: verificationStatus,
  isVerified,
  generateSignature
} = useAuctionVerification({
  network: computed(() => props.network),
  auction: computed(() => props.auction)
});

const bidAmount = ref('');
const bidPrice = ref('');
const bidFdv = ref('');
const isTermsAccepted = ref(false);

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

const canCancelOrder = computed(
  () => parseInt(props.auction.orderCancellationEndDate) > Date.now() / 1000
);

const isBiddingWithWeth = computed(() =>
  isWethContract(props.auction.addressBiddingToken)
);

const { data: userBalance, isError: isBalanceError } = useQuery({
  queryKey: ['balance', web3Account, () => props.auction.addressBiddingToken],
  queryFn: async () => {
    if (!web3Account.value) return 0n;

    const contract = new Contract(
      props.auction.addressBiddingToken,
      abis.erc20,
      provider.value
    );

    let balance: BigNumber = await contract.balanceOf(web3Account.value);

    if (isBiddingWithWeth.value) {
      const nativeTokenBalance = await provider.value.getBalance(
        web3Account.value
      );

      balance = balance.add(nativeTokenBalance);
    }

    return balance.toBigInt();
  },
  enabled: computed(() => !!web3Account.value)
});

const availableBalance = computed(() => {
  if (!userBalance.value) return 0n;

  if (isBiddingWithWeth.value) {
    return userBalance.value - parseUnits(ETH_MIN_BALANCE.toString(), 18);
  }

  return userBalance.value;
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

  const amount = parseUnits(
    bidAmount.value,
    Number(props.auction.decimalsBiddingToken)
  );

  const minBiddingAmount = BigInt(props.auction.minimumBiddingAmountPerOrder);

  if (amount <= minBiddingAmount) {
    const formattedMinimumPrice = formatUnits(
      minBiddingAmount,
      Number(props.auction.decimalsBiddingToken)
    );

    return `Amount must be bigger than ${_n(formattedMinimumPrice, 'standard', { maximumFractionDigits: Number(props.auction.decimalsBiddingToken) })} ${props.auction.symbolBiddingToken}`;
  }

  if (hasBalance.value && amount > availableBalance.value) {
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
    return `Must be higher than ${_n(minimumSellPrice, 'standard', { maximumFractionDigits: Number(props.auction.decimalsBiddingToken) })} ${props.auction.symbolBiddingToken}`;
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
    return 'You already have a bid at this price';
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

const pricePremium = computed(() => {
  const price = parseFloat(bidPrice.value);
  if (!price) return null;

  return convertPriceToPercentage(price);
});

const sliderValue = computed(() => {
  if (pricePremium.value === null) return 0;

  return Math.min(Math.max(pricePremium.value, 0), 100);
});

function convertPercentageToPrice(percentage: number) {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);
  const minPrice = parseFloat(props.auction.exactOrder?.price || '0');

  const basePrice = Math.max(clearingPrice, minPrice * (1 + MIN_PRICE_PREMIUM));

  const premiumPrice = basePrice * (1 + percentage / 100);

  return premiumPrice;
}

function convertPriceToPercentage(price: number) {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);
  const minPrice = parseFloat(props.auction.exactOrder?.price || '0');

  const basePrice = Math.max(clearingPrice, minPrice * (1 + MIN_PRICE_PREMIUM));

  return ((price - basePrice) / basePrice) * 100;
}

async function handlePlaceOrder() {
  if (!web3Account.value) {
    modalAccountOpen.value = true;
    return;
  }

  if (hasErrors.value) return;

  const attestation = await generateSignature();

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
    }),
    attestation,
    auction: props.auction
  });
}

function handleSetMaxAmount() {
  if (!userBalance.value) return 0;

  bidAmount.value = formatUnits(
    availableBalance.value,
    props.auction.decimalsBiddingToken
  );
}

function handlePriceUpdate(value: string) {
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

  bidFdv.value = removeTrailingZeroes(fdv, AMOUNT_DECIMALS);
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

  bidPrice.value = removeTrailingZeroes(price, AMOUNT_DECIMALS);
}

function handleSliderChange(value: number) {
  const price = convertPercentageToPrice(value);
  handlePriceUpdate(removeTrailingZeroes(price, AMOUNT_DECIMALS));
}

onMounted(() => {
  const clearingPrice = parseFloat(props.auction.currentClearingPrice);
  if (clearingPrice <= 0) return;

  handleSliderChange(25);
});
</script>

<template>
  <div>
    <AuctionVerificationInfo
      v-if="!isVerified"
      :verification-type="verificationType"
      :is-loading="verificationStatus === 'loading'"
      :is-error="verificationStatus === 'error'"
    />
    <div v-else class="s-box p-4 space-y-3">
      <UiMessage
        v-if="web3Account && isBalanceError"
        type="danger"
        class="mb-3"
      >
        Failed to load balance.
      </UiMessage>
      <div
        class="px-3 py-2 bg-skin-border rounded-lg border overflow-hidden"
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
                bidAmount && biddingTokenPrice
                  ? parseFloat(bidAmount) * biddingTokenPrice
                  : 0,
                'standard',
                {
                  maximumFractionDigits: 2
                }
              )
            }}
          </div>
          <button
            class="absolute top-0 right-0 text-skin-link flex items-center gap-1"
            @click="handleSetMaxAmount"
          >
            {{ _n(formattedBalance) }}
            {{ auction.symbolBiddingToken }}
            <IC-wallet class="inline-block shrink-0 size-[16px]" />
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
              bidPrice && biddingTokenPrice
                ? parseFloat(bidPrice) * biddingTokenPrice
                : 0,
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
              bidFdv && biddingTokenPrice
                ? parseFloat(bidFdv) * biddingTokenPrice
                : 0,
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
              class="flex justify-between w-full h-[7px] bg-gradient-to-r from-skin-link to-skin-link bg-no-repeat"
              :style="{
                backgroundSize: `${sliderValue}% 100%`
              }"
            >
              <div class="w-0 h-full"></div>
              <div class="w-0.5 bg-skin-border h-full"></div>
              <div class="w-0.5 bg-skin-border h-full"></div>
              <div class="w-0.5 bg-skin-border h-full"></div>
              <div class="w-0 bg-red-500 h-full"></div>
            </div>
          </div>
          <input
            :value="sliderValue"
            type="range"
            min="0"
            max="100"
            class="range-slider relative w-full h-[7px] appearance-none bg-transparent hover:cursor-pointer"
            @input="
              e =>
                handleSliderChange(Number((e.target as HTMLInputElement).value))
            "
          />
        </div>
        <div v-if="pricePremium !== null" class="text-[17px]">
          <template v-if="pricePremium === 0">
            Equal to current clearing price
          </template>
          <template v-else-if="pricePremium > 0">
            {{ _p(pricePremium / 100) }} above current clearing price
          </template>
          <template v-else>
            {{ _p(-pricePremium / 100) }} below current clearing price
          </template>
        </div>
      </div>
      <UiCheckbox v-model="isTermsAccepted" class="text-start">
        <div class="text-skin-text leading-[22px] top-[-1px] relative">
          By clicking "Place bid" you accept the Token Sale Privacy Policy
        </div>
      </UiCheckbox>
      <UiButton
        primary
        class="w-full"
        :disabled="hasErrors || isLoading || !isTermsAccepted"
        :loading="isLoading"
        @click="handlePlaceOrder"
      >
        Place bid
      </UiButton>
      <div class="text-xs text-center flex items-center justify-center gap-1.5">
        <IH-information-circle class="inline-block shrink-0" :size="16" />
        <span v-if="canCancelOrder">
          Can cancel until
          {{ _t(parseInt(auction.orderCancellationEndDate)) }}
        </span>
        <span v-else>Cannot be canceled once the bid is placed</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@mixin slider-thumb {
  @apply bg-skin-link rounded-full outline-skin-border;
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
