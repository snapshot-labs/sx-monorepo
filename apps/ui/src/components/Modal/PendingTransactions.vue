<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { getNetwork } from '@/networks';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const uiStore = useUiStore();
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Pending transactions</h3>
    </template>
    <div class="p-4">
      <div v-if="uiStore.pendingTransactions.length === 0" class="text-center">
        No pending transactions
      </div>
      <template v-else>
        <a
          v-for="pendingTx in uiStore.pendingTransactions"
          :key="pendingTx.txId"
          :href="
            getNetwork(pendingTx.networkId).helpers.getExplorerUrl(pendingTx.txId, 'transaction')
          "
          target="_blank"
          class="border rounded-lg px-3 py-2 flex items-center w-full mb-2 last:mb-0"
        >
          <IH-external-link />
          <div class="ml-2 truncate text-skin-link">{{ pendingTx.txId }}</div>
        </a>
      </template>
    </div>
  </UiModal>
</template>
