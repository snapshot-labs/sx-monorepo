<script setup lang="ts">
import pkg from '../../../package.json';

type ApiKeyEntry = {
  name: string;
  key: string;
  created: number;
};

useTitle('API keys');

const { web3Account } = useWeb3();

const storedApiKeys = useStorage(
  `${pkg.name}.api-keys`,
  {} as Record<string, ApiKeyEntry[]>
);

const modalOpen = ref(false);

const apiKeys = computed(
  () => (web3Account.value && storedApiKeys.value[web3Account.value]) || []
);

function handleCreated(apiKey: ApiKeyEntry) {
  if (!web3Account.value) return;
  const current = storedApiKeys.value[web3Account.value] || [];
  storedApiKeys.value[web3Account.value] = [...current, apiKey];
}

function handleDelete(index: number) {
  if (!web3Account.value) return;
  const current = [...(storedApiKeys.value[web3Account.value] || [])];
  current.splice(index, 1);
  storedApiKeys.value[web3Account.value] = current;
}

function shortenKey(key: string) {
  return `${key.slice(0, 8)}...${key.slice(-6)}`;
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center p-4">
      <span />
      <UiButton @click="modalOpen = true">Create key</UiButton>
    </div>
    <UiSectionHeader label="API keys" />
    <div
      v-for="(apiKey, i) in apiKeys"
      :key="apiKey.key"
      class="mx-4 py-3 border-b flex group"
    >
      <div class="flex-auto flex items-center min-w-0">
        <div class="flex flex-col leading-[22px] min-w-0 pr-2 md:pr-0">
          <h4 class="text-skin-link" v-text="apiKey.name" />
          <span class="text-skin-text text-[17px] font-mono">
            {{ shortenKey(apiKey.key) }}
          </span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-x-3">
        <TimeRelative
          v-if="apiKey.created"
          v-slot="{ relativeTime }"
          :time="apiKey.created"
        >
          <span class="text-skin-text text-sm hidden md:block">
            {{ relativeTime }}
          </span>
        </TimeRelative>
        <UiButton
          class="!px-3 hover:border-skin-danger"
          @click="handleDelete(i)"
        >
          <span class="text-skin-danger">Delete</span>
        </UiButton>
      </div>
    </div>
    <UiStateWarning v-if="!apiKeys.length" class="px-4 py-3">
      You have no API keys.
    </UiStateWarning>
    <teleport to="#modal">
      <ModalCreateApiKey
        :open="modalOpen"
        @close="modalOpen = false"
        @created="handleCreated"
      />
    </teleport>
  </div>
</template>
