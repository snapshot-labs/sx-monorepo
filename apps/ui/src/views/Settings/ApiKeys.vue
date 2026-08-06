<script setup lang="ts">
import { _t } from '@/helpers/utils';

const DESCRIPTION = 'Access the Snapshot APIs with your own API keys.';

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
  keys
} = useApiKeys();

const isStarknetAccount = computed(
  () => !!web3Account.value && web3Account.value.length !== 42
);
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
