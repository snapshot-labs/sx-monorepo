<script setup lang="ts">
import { getGenericExplorerUrl } from '@/helpers/generic';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
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
        <AppLink
          v-for="pendingTx in uiStore.pendingTransactions"
          :key="pendingTx.txId"
          :to="
            getGenericExplorerUrl(
              pendingTx.chainId,
              pendingTx.txId,
              'transaction'
            ) ?? undefined
          "
          class="border rounded-lg px-3 py-2 flex items-center w-full mb-2 last:mb-0"
        >
          <div class="truncate text-skin-link">{{ pendingTx.txId }}</div>
        </AppLink>
      </template>
    </div>
  </UiModal>
</template>
