<script setup lang="ts">
import { _t } from '@/helpers/utils';

const DESCRIPTION = 'Access the Snapshot APIs with your own API keys.';

const PERIOD_ITEMS = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' }
] as const;

useTitle('API keys');

const { web3, web3Account } = useWeb3();
const {
  isLoading,
  isError,
  reload,
  isAuthenticated,
  isAuthenticating,
  authenticate,
  isAuthError,
  keys,
  dailyUsage,
  monthlyUsage
} = useApiKeys();

const isStarknetAccount = computed(
  () => !!web3Account.value && web3Account.value.length !== 42
);

const usagePeriod = ref<'day' | 'month'>('day');
const usageSeries = computed(() =>
  usagePeriod.value === 'day' ? dailyUsage.value : monthlyUsage.value
);
const usageRangeLabel = computed(() =>
  usagePeriod.value === 'day' ? 'Last 30 days' : 'Last 12 months'
);

const usageView = ref<'chart' | 'table'>('chart');
</script>

<template>
  <div v-bind="$attrs" class="!h-auto">
    <UiLoading v-if="web3.authLoading" class="px-4 py-4 block" />

    <UiContainerSettings
      v-else-if="isStarknetAccount || !isAuthenticated"
      class="px-4 pt-4"
      title="API keys"
      :description="DESCRIPTION"
    >
      <UiStateWarning v-if="isStarknetAccount" class="max-w-[592px]">
        API keys are not available for Starknet accounts yet.
      </UiStateWarning>
      <div
        v-else
        class="border rounded-lg max-w-[592px] px-4 py-8 flex flex-col items-center gap-3 text-center"
      >
        <IH-lock-closed class="size-[24px]" />
        <div class="space-y-1">
          <h4 class="text-skin-heading">Authenticate your account</h4>
          <div class="text-sm leading-[18px] max-w-[360px]">
            Verify your account once to manage your keys.
          </div>
        </div>
        <UiAlert v-if="isAuthError" type="error">
          Your account could not be verified, please authenticate again.
        </UiAlert>
        <UiButton primary :loading="isAuthenticating" @click="authenticate">
          Authenticate
        </UiButton>
      </div>
    </UiContainerSettings>

    <template v-else>
      <div class="px-4 pt-4 max-w-[592px]">
        <h3>API keys</h3>
        <span class="inline-block" v-text="DESCRIPTION" />
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
      </UiColumnHeader>

      <UiLoading v-if="isLoading" class="px-4 py-3 block" />
      <div
        v-else-if="isError"
        class="px-4 py-3 max-w-[592px] flex flex-col gap-3 items-start"
      >
        <UiAlert type="error">Failed to load your API keys.</UiAlert>
        <UiButton @click="reload"><IH-refresh />Retry</UiButton>
      </div>
      <UiStateWarning v-else-if="keys.length === 0" class="px-4 py-3">
        You don't have any API keys yet.
      </UiStateWarning>
      <div v-else class="px-4">
        <div
          v-for="key in keys"
          :key="key.key"
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
        </div>
      </div>
    </template>
  </div>
</template>
