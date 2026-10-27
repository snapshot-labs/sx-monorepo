<script setup lang="ts">
import { buildUsage } from '@/helpers/keycard';
import { ApiKey } from '@/helpers/keycard/types';
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
  keys,
  dailyUsage,
  monthlyUsage
} = useApiKeys();

const isKeyModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const selectedKey = ref<ApiKey | null>(null);
const usagePeriod = ref<'day' | 'month'>('day');
const usageKey = ref('all');
const usageView = ref<'chart' | 'table'>('chart');

const isStarknetAccount = computed(
  () => !!web3Account.value && web3Account.value.length !== 42
);
const usageKeyItems = computed(() => [
  { key: 'all', label: 'All keys' },
  ...keys.value.map(key => ({ key: key.key, label: key.name }))
]);
const usageSeries = computed(() => {
  const isDaily = usagePeriod.value === 'day';
  const rows = (isDaily ? dailyUsage.value : monthlyUsage.value).filter(
    row => usageKey.value === 'all' || row.key === usageKey.value
  );
  return buildUsage(rows, isDaily ? 30 : 12, usagePeriod.value);
});
const usageRangeLabel = computed(() =>
  usagePeriod.value === 'day' ? 'Last 30 days' : 'Last 12 months'
);

watch(keys, () => {
  if (!keys.value.some(key => key.key === usageKey.value)) {
    usageKey.value = 'all';
  }
});

function openKeyModal(key: ApiKey | null = null) {
  selectedKey.value = key;
  isKeyModalOpen.value = true;
}

function openDeleteModal(key: ApiKey) {
  selectedKey.value = key;
  isDeleteModalOpen.value = true;
}
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
        <UiButton primary :loading="isAuthenticating" @click="authenticate">
          Authenticate
        </UiButton>
      </div>
    </UiContainerSettings>

    <template v-else>
      <div class="flex items-start justify-between gap-3 px-4 pt-4">
        <div class="max-w-[592px]">
          <h3>API keys</h3>
          <span class="inline-block" v-text="DESCRIPTION" />
        </div>
        <UiButton primary class="shrink-0" @click="openKeyModal()">
          New key
        </UiButton>
      </div>

      <div v-if="!isError" class="mt-4">
        <div class="flex items-center justify-between gap-2 mb-3 px-4">
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
              v-if="keys.length > 1"
              v-model="usageKey"
              title="API key"
              placement="end"
              :items="usageKeyItems"
            />
            <UiSelectDropdown
              v-model="usagePeriod"
              title="Period"
              placement="end"
              :items="PERIOD_ITEMS"
            />
          </div>
        </div>
        <UiLoading v-if="isLoading" class="px-4 py-3 block" />
        <div
          v-else-if="usageView === 'chart'"
          class="border rounded-xl p-4 mx-4"
        >
          <ApiUsageChart :series="usageSeries" :range-label="usageRangeLabel" />
        </div>
        <ApiUsageTable v-else :series="usageSeries" />
      </div>

      <UiSectionHeader class="mt-4" label="API keys" sticky />
      <UiColumnHeader class="space-x-3">
        <div class="flex-1 min-w-0 text-left">Name</div>
        <div class="flex-1 min-w-0">Key</div>
        <div class="hidden sm:flex w-[150px]">Created</div>
        <div class="min-w-3.5" />
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
          <div
            class="flex-1 min-w-0 text-skin-link font-semibold truncate"
            v-text="key.name"
          />
          <div class="flex flex-1 min-w-0">
            <ApiKeyField :value="key.key" masked inline />
          </div>
          <div class="hidden sm:flex w-[150px] shrink-0 items-center">
            {{ _t(key.created, 'MMM D, YYYY') }}
          </div>
          <UiDropdown>
            <template #button>
              <div class="flex items-center h-full">
                <button type="button" class="text-skin-link">
                  <IH-dots-horizontal />
                </button>
              </div>
            </template>
            <template #items>
              <UiDropdownItem @click="openKeyModal(key)">
                <IS-pencil :width="16" />
                Rename key
              </UiDropdownItem>
              <UiDropdownItem
                class="!text-skin-danger"
                @click="openDeleteModal(key)"
              >
                <IH-trash :width="16" />
                Delete key
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>
      <teleport to="#modal">
        <ModalApiKey
          :open="isKeyModalOpen"
          :api-key="selectedKey"
          @close="isKeyModalOpen = false"
        />
        <ModalDeleteApiKey
          :open="isDeleteModalOpen"
          :api-key="selectedKey"
          @close="isDeleteModalOpen = false"
        />
      </teleport>
    </template>
  </div>
</template>
