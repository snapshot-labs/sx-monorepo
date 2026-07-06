<script setup lang="ts">
import { ApiKey } from '@/helpers/keycard/types';
import { _n, _t } from '@/helpers/utils';

useTitle('API keys');

const { web3 } = useWeb3();
const { isLoading, keys, plan, usage, createKey, revokeKey, upgradePlan } =
  useApiKeys();

const isCreateModalOpen = ref(false);
const isUpgradeModalOpen = ref(false);
const keyToRevoke = ref<ApiKey | null>(null);

const resetTimestamp = computed(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
});

const meters = computed(() => [
  { label: 'Hub API', used: usage.value.hub },
  { label: 'Score API', used: usage.value.score }
]);

function meterColor(used: number) {
  const ratio = used / plan.value.quotaPerApp;
  if (ratio >= 0.95) return 'bg-rose-500';
  if (ratio >= 0.8) return 'bg-amber-500';
  return 'bg-skin-link';
}

function meterWidth(used: number) {
  const ratio = Math.min(used / plan.value.quotaPerApp, 1);
  return `${Math.max(ratio * 100, 0.5)}%`;
}

function keyUsage(key: ApiKey) {
  return key.usage.hub + key.usage.score;
}
</script>

<template>
  <div v-bind="$attrs" class="!h-auto">
    <UiLoading v-if="web3.authLoading || isLoading" class="px-4 py-4 block" />
    <template v-else>
      <UiContainerSettings
        class="px-4 pt-4"
        title="API keys"
        description="API keys give you higher rate limits on the Snapshot APIs. Usage is counted per account, across all your keys."
      >
        <UiEyebrow class="mb-3 font-medium">Current plan</UiEyebrow>

        <div class="border rounded-xl p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex-1">
              <h5 class="text-lg font-semibold text-skin-heading">
                {{ plan.name }} plan
              </h5>
              <p class="text-sm text-skin-text">
                <template v-if="plan.price > 0">
                  ${{ plan.price }} / month
                </template>
                <template v-else>
                  Upgrade for higher limits and no rate limit
                </template>
              </p>
            </div>
            <UiButton
              primary
              class="w-full sm:w-auto"
              @click="isUpgradeModalOpen = true"
            >
              Upgrade plan
            </UiButton>
          </div>
          <div class="border-t mt-3 pt-3 space-y-3">
            <div v-for="meter in meters" :key="meter.label">
              <div class="flex items-center justify-between text-sm mb-1">
                <div class="text-skin-heading" v-text="meter.label" />
                <div>
                  {{ _n(meter.used) }} /
                  {{ _n(plan.quotaPerApp, 'compact') }} requests
                </div>
              </div>
              <div class="h-[6px] rounded-full bg-skin-border overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="meterColor(meter.used)"
                  :style="{ width: meterWidth(meter.used) }"
                />
              </div>
            </div>
            <div class="text-sm leading-[18px]">
              Quota resets {{ _t(resetTimestamp, 'MMM D, YYYY') }}
            </div>
          </div>
        </div>
      </UiContainerSettings>

      <UiSectionHeader class="mt-4" label="API keys" sticky />
      <UiColumnHeader class="space-x-3">
        <div class="grow text-left">Name</div>
        <div class="hidden sm:flex w-[190px]">Created</div>
        <div class="w-[150px] flex justify-end">Usage this month</div>
        <div class="min-w-3.5" />
      </UiColumnHeader>

      <UiStateWarning v-if="keys.length === 0" class="px-4 py-3">
        No API keys yet. Create one to start making authenticated requests.
      </UiStateWarning>
      <div v-else class="px-4">
        <div
          v-for="key in keys"
          :key="key.id"
          class="border-b flex space-x-3 py-3"
        >
          <div class="flex grow items-center overflow-hidden">
            <div class="text-skin-link font-semibold truncate">
              {{ key.name }}
            </div>
          </div>
          <div class="hidden sm:flex w-[190px] shrink-0 items-center">
            {{ _t(key.created / 1000, 'MMM D, YYYY') }}
          </div>
          <div class="w-[150px] shrink-0 flex items-center justify-end">
            {{ _n(keyUsage(key), 'compact') }} reqs
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
              <UiDropdownItem @click="keyToRevoke = key">
                <IH-trash :width="16" />
                Revoke key
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>
      <div class="px-4 py-3">
        <UiButton @click="isCreateModalOpen = true">
          <IH-plus class="shrink-0 size-[16px]" />
          New key
        </UiButton>
      </div>
    </template>
  </div>
  <ModalApiKeyCreate
    :open="isCreateModalOpen"
    :create-key="createKey"
    @close="isCreateModalOpen = false"
  />
  <ModalApiKeyRevoke
    :open="!!keyToRevoke"
    :api-key="keyToRevoke"
    :revoke-key="revokeKey"
    @close="keyToRevoke = null"
  />
  <ModalApiKeysUpgrade
    :open="isUpgradeModalOpen"
    :current-plan="plan.id"
    :upgrade-plan="upgradePlan"
    @close="isUpgradeModalOpen = false"
  />
</template>
