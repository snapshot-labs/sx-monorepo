<script setup lang="ts">
import { keyCost, MAX_KEYS, PRICE_PER_REQUEST } from '@/helpers/keycard';
import { ApiKey } from '@/helpers/keycard/types';
import { _t } from '@/helpers/utils';

const DESCRIPTION =
  'Access the Snapshot APIs, billed per request from your credit balance.';

const PERIOD_ITEMS = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' }
] as const;

useTitle('API keys');

const { web3 } = useWeb3();
const uiStore = useUiStore();
const {
  isLoading,
  isError,
  reload,
  isVerified,
  isVerifying,
  verify,
  keys,
  balance,
  dailyUsage,
  monthlyUsage,
  payments,
  isPaymentsPending,
  isPaymentsError,
  createKey,
  revokeKey,
  topUp
} = useApiKeys();

const isCreateModalOpen = ref(false);
const isTopupModalOpen = ref(false);
const keyToRevoke = ref<ApiKey | null>(null);

const atKeyLimit = computed(() => keys.value.length >= MAX_KEYS);

const usagePeriod = ref<'day' | 'month'>('day');
const usageSeries = computed(() =>
  usagePeriod.value === 'day' ? dailyUsage.value : monthlyUsage.value
);
const usageRangeLabel = computed(() =>
  usagePeriod.value === 'day' ? 'Last 30 days' : 'Last 12 months'
);

const usageView = ref<'chart' | 'table'>('chart');

const pricing = [
  { label: 'Hub API', per1k: (PRICE_PER_REQUEST.hub * 1000).toFixed(2) },
  { label: 'Score API', per1k: (PRICE_PER_REQUEST.score * 1000).toFixed(2) }
];

async function handleVerify() {
  try {
    await verify();
  } catch (err) {
    console.error('Failed to verify account', err);
    uiStore.addNotification('error', 'An error occurred, please try again.');
  }
}
</script>

<template>
  <div v-bind="$attrs" class="!h-auto">
    <UiLoading v-if="web3.authLoading || isLoading" class="px-4 py-4 block" />

    <UiContainerSettings
      v-else-if="isError"
      class="px-4 pt-4"
      title="API keys"
      :description="DESCRIPTION"
    >
      <div class="max-w-[592px] flex flex-col gap-3 items-start">
        <UiAlert type="error">
          Failed to load your API keys. Please try again.
        </UiAlert>
        <UiButton @click="reload"><IH-refresh />Retry</UiButton>
      </div>
    </UiContainerSettings>

    <UiContainerSettings
      v-else-if="!isVerified"
      class="px-4 pt-4"
      title="API keys"
      :description="DESCRIPTION"
    >
      <div
        class="border rounded-lg max-w-[592px] px-4 py-8 flex flex-col items-center gap-3 text-center"
      >
        <IH-lock-closed class="size-[24px]" />
        <div class="space-y-1">
          <h4 class="text-skin-heading">Authenticate your account</h4>
          <div class="text-sm leading-[18px] max-w-[360px]">
            Verify your account once to manage your keys.
          </div>
        </div>
        <UiButton primary :loading="isVerifying" @click="handleVerify">
          Authenticate
        </UiButton>
      </div>
    </UiContainerSettings>

    <template v-else>
      <div class="flex items-start justify-between gap-4 px-4 pt-4">
        <div class="max-w-[592px]">
          <h3>API keys</h3>
          <span class="inline-block" v-text="DESCRIPTION" />
        </div>
        <UiTooltip
          class="shrink-0"
          :title="
            atKeyLimit
              ? `You can create up to ${MAX_KEYS} keys — revoke one to add another`
              : ''
          "
        >
          <UiButton :disabled="atKeyLimit" @click="isCreateModalOpen = true">
            <IH-plus class="shrink-0 size-[16px]" />
            New API key
          </UiButton>
        </UiTooltip>
      </div>

      <div class="px-4 mt-4 max-w-[592px]">
        <UiEyebrow class="mb-3 font-medium">Credit balance</UiEyebrow>

        <div class="border rounded-xl p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex-1">
              <h5 class="text-lg font-semibold text-skin-heading">
                ${{ balance.toFixed(2) }}
                <span class="text-sm font-normal text-skin-text"
                  >remaining</span
                >
              </h5>
            </div>
            <UiButton
              primary
              class="w-full sm:w-auto"
              @click="isTopupModalOpen = true"
            >
              Top up
            </UiButton>
          </div>
          <div class="border-t mt-4 pt-4">
            <div class="mb-2 text-sm font-medium text-skin-heading">
              Pricing
            </div>
            <div class="space-y-2 text-sm">
              <div
                v-for="item in pricing"
                :key="item.label"
                class="flex items-center justify-between"
              >
                <span class="text-skin-text" v-text="item.label" />
                <span class="text-skin-heading">
                  ${{ item.per1k }} / 1k requests
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 mt-4">
        <div class="flex items-center justify-between gap-2 mb-3">
          <UiEyebrow class="font-medium">Usage</UiEyebrow>
          <div class="flex items-center gap-2">
            <div
              class="relative top-1 flex items-center rounded-full border p-1"
            >
              <button
                type="button"
                class="flex items-center justify-center rounded-full size-[32px] transition-colors"
                :class="
                  usageView === 'chart'
                    ? 'bg-skin-border text-skin-link'
                    : 'text-skin-text hover:text-skin-link'
                "
                aria-label="Chart view"
                @click="usageView = 'chart'"
              >
                <IH-chart-square-bar class="size-[18px]" />
              </button>
              <button
                type="button"
                class="flex items-center justify-center rounded-full size-[32px] transition-colors"
                :class="
                  usageView === 'table'
                    ? 'bg-skin-border text-skin-link'
                    : 'text-skin-text hover:text-skin-link'
                "
                aria-label="Table view"
                @click="usageView = 'table'"
              >
                <IH-table class="size-[18px]" />
              </button>
            </div>
            <UiSelectDropdown
              v-model="usagePeriod"
              title="Period"
              placement="end"
              :items="PERIOD_ITEMS"
            />
          </div>
        </div>
        <div v-if="usageView === 'chart'" class="border rounded-xl p-4">
          <ApiUsageChart :series="usageSeries" :range-label="usageRangeLabel" />
        </div>
        <ApiSpendingTable v-else :series="usageSeries" />
      </div>

      <UiSectionHeader class="mt-4" label="Keys" sticky />
      <UiColumnHeader class="space-x-3">
        <div class="grow text-left">Name</div>
        <div class="hidden sm:flex w-[150px]">Created</div>
        <div class="w-[110px] flex justify-end">Spent</div>
        <div class="min-w-3.5" />
      </UiColumnHeader>

      <UiStateWarning v-if="keys.length === 0" class="px-4 py-3">
        No API keys yet. Create one to start using the Snapshot APIs.
      </UiStateWarning>
      <div v-else class="px-4">
        <div
          v-for="key in keys"
          :key="key.id"
          class="border-b flex space-x-3 py-3 items-center"
        >
          <div class="grow overflow-hidden flex items-center gap-2">
            <div
              class="text-skin-link font-semibold truncate"
              v-text="key.name"
            />
            <ApiKeyField :value="key.key" masked inline class="shrink-0" />
          </div>
          <div class="hidden sm:flex w-[150px] shrink-0 items-center">
            {{ _t(key.created, 'MMM D, YYYY') }}
          </div>
          <div class="w-[110px] shrink-0 flex items-center justify-end">
            ${{ keyCost(key).toFixed(2) }}
          </div>

          <UiDropdown>
            <template #button>
              <div class="flex items-center h-full">
                <button
                  type="button"
                  class="text-skin-link"
                  aria-label="Key actions"
                >
                  <IH-dots-horizontal />
                </button>
              </div>
            </template>
            <template #items>
              <UiDropdownItem @click="keyToRevoke = key">
                <IH-trash :width="16" />
                Revoke key
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>

      <PaymentHistory
        :payments="payments"
        :chain-id="1"
        :is-pending="isPaymentsPending"
        :is-error="isPaymentsError"
      />
    </template>
  </div>
  <ModalApiKeyCreate
    :open="isCreateModalOpen"
    :create-key="createKey"
    :existing-names="keys.map(key => key.name)"
    @close="isCreateModalOpen = false"
  />
  <ModalApiKeyRevoke
    :open="!!keyToRevoke"
    :api-key="keyToRevoke"
    :revoke-key="revokeKey"
    @close="keyToRevoke = null"
  />
  <ModalApiKeysTopup
    :open="isTopupModalOpen"
    :top-up="topUp"
    @close="isTopupModalOpen = false"
  />
</template>
