<script setup lang="ts">
import { useSnack } from '@/composables/useSnack';
import {
  computeChance,
  estimatePayout,
  estimateSell,
  formatCents,
  formatEth,
  parseEth
} from '@/helpers/snack';
import { _n } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{
  open: boolean;
  proposal: Proposal;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'connect'): void;
}>();

const proposalRef = toRef(props, 'proposal');

const {
  marketState,
  userYesBalance,
  userNoBalance,
  userEthBalance,
  ethPrice,
  txPending,
  buyOutcome,
  sellOutcome,
  redeem,
  refreshState
} = useSnack(proposalRef);

const { web3 } = useWeb3();

const ethAmount = ref('');
const sellAmount = ref('');
const selectedOutcome = ref<0 | 1>(0);
const sellOutcomeSelection = ref<0 | 1>(0);
const activeTab = ref<'buy' | 'sell'>('buy');

const yesLabel = computed(() => props.proposal.choices[0]);
const noLabel = computed(() => props.proposal.choices[1]);
const outcomeLabel = computed(() =>
  selectedOutcome.value === 0 ? yesLabel.value : noLabel.value
);

const hasYes = computed(() => userYesBalance.value > 0n);
const hasNo = computed(() => userNoBalance.value > 0n);
const hasPosition = computed(() => hasYes.value || hasNo.value);

const isResolved = computed(() => marketState.value?.resolved ?? false);
const winnerLabel = computed(() => {
  if (!marketState.value?.resolved) return '';
  return marketState.value.winningOutcome === 0
    ? yesLabel.value
    : noLabel.value;
});

const canRedeem = computed(() => {
  if (!isResolved.value || !marketState.value) return false;
  const winBal =
    marketState.value.winningOutcome === 0
      ? userYesBalance.value
      : userNoBalance.value;
  return winBal > 0n;
});

const yesCents = computed(() =>
  marketState.value ? formatCents(marketState.value.yesProb) : 50
);
const noCents = computed(() =>
  marketState.value ? formatCents(marketState.value.noProb) : 50
);

const postTradeChance = computed(() => {
  return computeChance(
    marketState.value?.supplyYes ?? 0n,
    marketState.value?.supplyNo ?? 0n,
    marketState.value?.reserve ?? 0n,
    selectedOutcome.value,
    Number(parseEth(ethAmount.value)),
    false
  );
});

const displayChance = computed(() => {
  if (postTradeChance.value) {
    return selectedOutcome.value === 0
      ? postTradeChance.value.yes
      : postTradeChance.value.no;
  }
  return selectedOutcome.value === 0 ? yesCents.value : noCents.value;
});

const estimate = computed(() => {
  const amount = parseEth(ethAmount.value);
  if (amount <= 0n) return null;

  const yes = marketState.value?.supplyYes ?? 0n;
  const no = marketState.value?.supplyNo ?? 0n;
  const res = marketState.value?.reserve ?? 0n;

  const result = estimatePayout(yes, no, res, selectedOutcome.value, amount);
  if (result.payout <= 0) return null;
  return result;
});

const sellBalance = computed(() =>
  sellOutcomeSelection.value === 0 ? userYesBalance.value : userNoBalance.value
);

const sellTokenAmount = computed(() => {
  const parsed = parseEth(sellAmount.value);
  return parsed > sellBalance.value ? sellBalance.value : parsed;
});

const sellEstReturn = computed(() => {
  if (!marketState.value || sellTokenAmount.value <= 0n) return 0;
  return estimateSell(
    marketState.value.supplyYes,
    marketState.value.supplyNo,
    marketState.value.reserve,
    sellOutcomeSelection.value,
    sellTokenAmount.value
  );
});

const postSellChance = computed(() => {
  if (!marketState.value) return null;
  return computeChance(
    marketState.value.supplyYes,
    marketState.value.supplyNo,
    marketState.value.reserve,
    sellOutcomeSelection.value,
    Number(sellTokenAmount.value),
    true
  );
});

const sellDisplayChance = computed(() => {
  if (postSellChance.value) {
    return sellOutcomeSelection.value === 0
      ? postSellChance.value.yes
      : postSellChance.value.no;
  }
  return sellOutcomeSelection.value === 0 ? yesCents.value : noCents.value;
});

const price = computed(() => ethPrice.value ?? 0);

function toUsd(weiAmount: number): number {
  return (weiAmount / 1e18) * price.value;
}

const amountInput = ref<{ $el?: HTMLElement } | null>(null);

// Reset and focus input on modal open
watch(
  () => props.open,
  open => {
    if (open) {
      ethAmount.value = '';
      sellAmount.value = '';
      activeTab.value = 'buy';
      selectedOutcome.value = 0;
      nextTick(() => {
        amountInput.value?.$el?.querySelector('input')?.focus();
      });
    }
  }
);

function setMax() {
  ethAmount.value = formatEth(userEthBalance.value);
}

function setSellMax() {
  sellAmount.value = formatEth(sellBalance.value);
}

// Refresh balances when switching to sell tab
watch(activeTab, () => {
  if (activeTab.value === 'sell') {
    refreshState();
  }
});

// Reset to buy tab if user no longer has a position
watch(hasPosition, () => {
  if (!hasPosition.value) {
    activeTab.value = 'buy';
  }
});

// Auto-select the side the user holds when entering sell tab
watch(
  [hasYes, hasNo, activeTab],
  () => {
    if (activeTab.value !== 'sell') return;
    if (!hasYes.value && hasNo.value) {
      sellOutcomeSelection.value = 1;
    } else if (!hasNo.value && hasYes.value) {
      sellOutcomeSelection.value = 0;
    }
  },
  { immediate: true }
);

// Prefill sell amount with max whenever balance changes or outcome switches
watch(
  [sellBalance, sellOutcomeSelection, activeTab],
  () => {
    if (activeTab.value !== 'sell') return;
    sellAmount.value = sellBalance.value > 0n ? formatEth(sellBalance.value) : '';
  },
  { immediate: true }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Prediction market</h3>
    </template>

    <div class="p-4 space-y-4">
      <div class="text-skin-text text-md text-center">
        <template v-if="isResolved">
          This market has been resolved. The winning outcome is
          <span class="text-skin-link">{{ winnerLabel }}</span
          >.
        </template>
        <template v-else-if="activeTab === 'sell'">
          <div class="mb-2">
            <UiButton class="!inline-flex !min-w-0 !font-normal" @click="activeTab = 'buy'">
              <IH-switch-horizontal class="w-[1em] h-[1em]" />
              Sell
            </UiButton>
          </div>
          Sell your
          <span class="text-skin-link">{{
            sellOutcomeSelection === 0 ? yesLabel : noLabel
          }}</span>
          {{ ' ' }}
          <span class="text-skin-link">shares</span> to convert them back to
          ETH. Sell early to lock in profit or limit your loss.
        </template>
        <template v-else-if="selectedOutcome === 0">
          <div v-if="hasPosition" class="mb-2">
            <UiButton class="!inline-flex !min-w-0 !font-normal" @click="activeTab = 'sell'">
              <IH-switch-horizontal class="w-[1em] h-[1em]" />
              Buy
            </UiButton>
          </div>
          Buy
          <span class="text-skin-link">{{ yesLabel }}</span>
          {{ ' ' }}
          <span class="text-skin-link">shares</span> if you think the proposal
          will <span class="text-skin-link">pass</span>. You'll earn a profit if
          you're right.
        </template>
        <template v-else>
          <div v-if="hasPosition" class="mb-2">
            <UiButton class="!inline-flex !min-w-0 !font-normal" @click="activeTab = 'sell'">
              <IH-switch-horizontal class="w-[1em] h-[1em]" />
              Buy
            </UiButton>
          </div>
          Buy
          <span class="text-skin-link">{{ noLabel }}</span>
          {{ ' ' }}
          <span class="text-skin-link">shares</span> if you think the proposal
          will <span class="text-skin-link">fail</span>. You'll earn a profit if
          you're right.
        </template>
      </div>

      <!-- Resolved state -->
      <div v-if="isResolved" class="space-y-3">
        <div
          class="rounded-xl p-4 text-center"
          :class="
            winnerLabel === 'Yes' ? 'bg-skin-success/10' : 'bg-skin-danger/10'
          "
        >
          <div class="text-xs uppercase tracking-wide text-skin-text mb-1">
            Outcome
          </div>
          <div
            class="text-xl font-bold"
            :class="
              winnerLabel === 'Yes' ? 'text-skin-success' : 'text-skin-danger'
            "
          >
            {{ winnerLabel }}
          </div>
        </div>

        <div v-if="hasPosition" class="space-y-2">
          <div v-if="hasYes" class="flex justify-between items-center text-sm">
            <span class="text-skin-text">Your {{ yesLabel }} tokens</span>
            <span class="text-skin-link font-medium">
              {{ formatEth(userYesBalance) }}
            </span>
          </div>
          <div v-if="hasNo" class="flex justify-between items-center text-sm">
            <span class="text-skin-text">Your {{ noLabel }} tokens</span>
            <span class="text-skin-link font-medium">
              {{ formatEth(userNoBalance) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Active market -->
      <div v-else class="space-y-4">
        <!-- Buy tab -->
        <div v-if="activeTab === 'buy'" class="space-y-4">
          <!-- Outcome buttons -->
          <div class="flex gap-2">
            <UiButton
              class="flex-1"
              :class="
                selectedOutcome === 0
                  ? 'snack-btn-yes-active'
                  : 'snack-btn-yes-idle'
              "
              @click="selectedOutcome = 0"
            >
              {{ yesLabel }} {{ yesCents }}%
            </UiButton>
            <UiButton
              class="flex-1"
              :class="
                selectedOutcome === 1
                  ? 'snack-btn-no-active'
                  : 'snack-btn-no-idle'
              "
              @click="selectedOutcome = 1"
            >
              {{ noLabel }} {{ noCents }}%
            </UiButton>
          </div>

          <div class="space-y-2">
          <!-- Amount -->
          <div class="s-box s-input-pb-0">
            <div class="relative">
              <UiInputAmount
                ref="amountInput"
                v-model="ethAmount"
                :definition="{
                  type: 'string',
                  title: 'Amount (ETH)',
                  examples: ['0']
                }"
              />
              <button
                v-if="web3.account"
                type="button"
                class="absolute right-3 top-1"
                @click="setMax"
                v-text="'max'"
              />
            </div>
          </div>

          <!-- Estimated payout -->
          <div class="space-y-0.5">
            <div class="flex justify-between">
              <span class="text-skin-text">
                {{
                  selectedOutcome === 0 ? 'Chance to pass' : 'Chance to fail'
                }}
              </span>
              <span class="font-medium text-skin-link">
                {{ displayChance }}%
              </span>
            </div>
            <div v-if="estimate" class="flex justify-between">
              <span class="text-skin-text">
                Est. return if {{ outcomeLabel }} wins
              </span>
              <span class="text-skin-heading font-medium">
                {{ _n(estimate.payout / 1e18, 'standard', { maximumFractionDigits: 6 }) }} ETH
                <span class="text-skin-text"
                  >${{
                    _n(toUsd(estimate.payout), 'standard', {
                      maximumFractionDigits: 2
                    })
                  }}</span
                >{{ ' ' }}
                <span
                  v-if="
                    Number(ethAmount) > 0 &&
                    estimate.profit > 0 &&
                    Math.round(
                      (estimate.profit / (Number(ethAmount) * 1e18)) * 1000
                    ) > 0
                  "
                  class="text-skin-success"
                >
                  +{{
                    _n(
                      (estimate.profit / (Number(ethAmount) * 1e18)) * 100,
                      'standard',
                      { maximumFractionDigits: 1 }
                    )
                  }}%
                </span>
              </span>
            </div>
          </div>
          </div>
        </div>

        <!-- Sell tab -->
        <div v-if="activeTab === 'sell'" class="space-y-4">
          <div
            v-if="!web3.account"
            class="text-center text-skin-text text-sm py-4"
          >
            Connect your wallet to sell
          </div>
          <template v-else-if="hasPosition">
            <!-- Outcome buttons -->
            <div class="flex gap-2">
              <UiButton
                class="flex-1"
                :class="
                  hasYes
                    ? sellOutcomeSelection === 0
                      ? 'snack-btn-yes-active'
                      : 'snack-btn-yes-idle'
                    : ''
                "
                :disabled="!hasYes"
                @click="sellOutcomeSelection = 0"
              >
                {{ yesLabel }} {{ yesCents }}%
              </UiButton>
              <UiButton
                class="flex-1"
                :class="
                  hasNo
                    ? sellOutcomeSelection === 1
                      ? 'snack-btn-no-active'
                      : 'snack-btn-no-idle'
                    : ''
                "
                :disabled="!hasNo"
                @click="sellOutcomeSelection = 1"
              >
                {{ noLabel }} {{ noCents }}%
              </UiButton>
            </div>

            <div class="space-y-2">
            <!-- Shares amount -->
            <div class="s-box s-input-pb-0">
              <div class="relative">
                <UiInputAmount
                  v-model="sellAmount"
                  :definition="{
                    type: 'string',
                    title: 'Shares',
                    examples: ['0']
                  }"
                />
                <button
                  v-if="sellBalance > 0n"
                  type="button"
                  class="absolute right-3 top-1"
                  @click="setSellMax"
                  v-text="'max'"
                />
              </div>
            </div>

            <!-- Estimated return -->
            <div class="space-y-0.5">
              <div class="flex justify-between">
                <span class="text-skin-text">
                  {{
                    sellOutcomeSelection === 0
                      ? 'Chance to pass'
                      : 'Chance to fail'
                  }}
                </span>
                <span class="font-medium text-skin-link">
                  {{ sellDisplayChance }}%
                </span>
              </div>
              <div v-if="sellEstReturn > 0" class="flex justify-between">
                <span class="text-skin-text">Est. return</span>
                <span class="text-skin-heading font-medium">
                  {{ _n(sellEstReturn / 1e18, 'standard', { maximumFractionDigits: 6 }) }} ETH
                  <span class="text-skin-text"
                    >${{
                      _n(toUsd(sellEstReturn), 'standard', {
                        maximumFractionDigits: 2
                      })
                    }}</span
                  >{{ ' ' }}
                  <span
                    v-if="
                      Number(sellAmount) > 0 &&
                      Math.round(
                        Math.abs(
                          ((sellEstReturn - Number(sellTokenAmount)) /
                            Number(sellTokenAmount)) *
                            1000
                        )
                      ) > 0
                    "
                    :class="
                      sellEstReturn >= Number(sellTokenAmount)
                        ? 'text-skin-success'
                        : 'text-skin-danger'
                    "
                  >
                    {{ sellEstReturn >= Number(sellTokenAmount) ? '+' : ''
                    }}{{
                      _n(
                        ((sellEstReturn - Number(sellTokenAmount)) /
                          Number(sellTokenAmount)) *
                          100,
                        'standard',
                        { maximumFractionDigits: 1 }
                      )
                    }}%
                  </span>
                </span>
              </div>
            </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <!-- Resolved: Redeem -->
      <UiButton
        v-if="isResolved && canRedeem"
        primary
        class="w-full"
        :loading="txPending"
        @click="redeem"
      >
        Redeem winnings
      </UiButton>

      <!-- Buy tab -->
      <template v-else-if="activeTab === 'buy'">
        <UiButton
          v-if="web3.account"
          primary
          class="w-full"
          :loading="txPending"
          :disabled="!ethAmount || Number(ethAmount) <= 0"
          @click="buyOutcome(selectedOutcome, ethAmount)"
        >
          Buy
        </UiButton>
        <UiButton v-else primary class="w-full" @click="emit('connect')">
          Connect wallet
        </UiButton>
      </template>

      <!-- Sell tab -->
      <UiButton
        v-else-if="activeTab === 'sell' && hasPosition"
        primary
        class="w-full"
        :loading="txPending"
        :disabled="
          !sellAmount || sellTokenAmount <= 0n || sellTokenAmount > sellBalance
        "
        @click="sellOutcome(sellOutcomeSelection, sellTokenAmount, sellOutcomeSelection === 0 ? yesLabel : noLabel)"
      >
        Sell
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.snack-btn-yes-active {
  background: rgba(var(--success));
  color: white;
  border-color: rgba(var(--success));
}
.snack-btn-yes-idle {
  background: transparent;
  color: rgba(var(--success));
  border-color: rgba(var(--success));
}
.snack-btn-no-active {
  background: rgba(var(--danger));
  color: white;
  border-color: rgba(var(--danger));
}
.snack-btn-no-idle {
  background: transparent;
  color: rgba(var(--danger));
  border-color: rgba(var(--danger));
}
</style>
