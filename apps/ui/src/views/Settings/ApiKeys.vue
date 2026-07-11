<script setup lang="ts">
import { FREE_CREDIT, keyCost } from '@/helpers/keycard';
import { ApiKey } from '@/helpers/keycard/types';
import { _n, _t } from '@/helpers/utils';

const DESCRIPTION =
  'Access the Snapshot APIs, billed per request from your credit balance.';

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
  usage,
  spend,
  createKey,
  revokeKey,
  topUp
} = useApiKeys();

const isCreateModalOpen = ref(false);
const isTopupModalOpen = ref(false);
const keyToRevoke = ref<ApiKey | null>(null);

const meters = computed(() => [
  { label: 'Hub API', reqs: usage.value.hub },
  { label: 'Score API', reqs: usage.value.score }
]);

// Credit depletion: how much of the total credit (free + top-ups) is spent.
const creditUsedRatio = computed(() => {
  const total = balance.value + spend.value;
  return total > 0 ? spend.value / total : 0;
});

const creditBarColor = computed(() => {
  if (creditUsedRatio.value >= 0.95) return 'bg-rose-500';
  if (creditUsedRatio.value >= 0.8) return 'bg-amber-500';
  return 'bg-skin-link';
});

const creditBarWidth = computed(
  () => `${Math.max(Math.min(creditUsedRatio.value, 1) * 100, 0.5)}%`
);

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
        <UiButton class="shrink-0" @click="isCreateModalOpen = true">
          <IH-plus class="inline-block" />
          New API key
        </UiButton>
      </div>

      <div class="px-4 mt-4 max-w-[592px]">
        <UiEyebrow class="mb-3 font-medium">Credit balance</UiEyebrow>

        <div class="border rounded-xl p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex-1">
              <div class="text-lg font-semibold text-skin-heading">
                ${{ balance.toFixed(2) }}
              </div>
              <div class="text-sm text-skin-text">
                remaining · includes ${{ FREE_CREDIT }} free credit
              </div>
            </div>
            <UiButton
              primary
              class="w-full sm:w-auto"
              @click="isTopupModalOpen = true"
            >
              Top up
            </UiButton>
          </div>
          <div class="mt-3 h-[6px] rounded-full bg-skin-border overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="creditBarColor"
              :style="{ width: creditBarWidth }"
            />
          </div>
          <div class="border-t mt-3 pt-3 space-y-2">
            <div
              v-for="meter in meters"
              :key="meter.label"
              class="flex items-center justify-between text-sm"
            >
              <div class="text-skin-heading" v-text="meter.label" />
              <div>{{ _n(meter.reqs) }} requests</div>
            </div>
          </div>
        </div>
      </div>

      <UiSectionHeader class="mt-4" label="Keys" />

      <UiStateWarning v-if="keys.length === 0" class="px-4 py-3">
        No API keys yet. Create one to start using the Snapshot APIs.
      </UiStateWarning>
      <div v-else class="px-4 max-w-[592px] space-y-3">
        <div
          v-for="key in keys"
          :key="key.id"
          class="border rounded-lg p-3 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div
                class="text-skin-link font-semibold truncate"
                v-text="key.name"
              />
              <div class="text-sm text-skin-text">
                Created {{ _t(key.created / 1000, 'MMM D, YYYY') }} · ${{
                  keyCost(key).toFixed(2)
                }}
                spent
              </div>
            </div>
            <UiTooltip title="Revoke key">
              <button
                type="button"
                class="text-skin-link hover:text-skin-danger shrink-0 flex"
                aria-label="Revoke key"
                @click="keyToRevoke = key"
              >
                <IH-trash class="size-[18px]" />
              </button>
            </UiTooltip>
          </div>
          <ApiKeyField :value="key.key" maskable />
        </div>
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
  <ModalApiKeysTopup
    :open="isTopupModalOpen"
    :top-up="topUp"
    @close="isTopupModalOpen = false"
  />
</template>
