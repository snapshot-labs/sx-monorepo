<script setup lang="ts">
import { getGenericExplorerUrl } from '@/helpers/generic';

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
            getGenericExplorerUrl(
              pendingTx.chainId,
              pendingTx.txId,
              'transaction'
            ) ?? undefined
          "
          target="_blank"
          class="border rounded-lg px-3 py-2 flex items-center w-full mb-2 last:mb-0"
        >
          <IH-arrow-sm-right class="-rotate-45" />
          <div class="ml-2 truncate text-skin-link">{{ pendingTx.txId }}</div>
        </a>
      </template>
    </div>
  </UiModal>
</template>
