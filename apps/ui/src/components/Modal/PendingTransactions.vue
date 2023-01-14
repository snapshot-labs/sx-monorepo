<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { currentNetwork } from '@/networks';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const uiStore = useUiStore();

const totalCount = computed(
  () => uiStore.pendingTransactions.length + uiStore.broadcastingTransactionsCount
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Pending transactions</h3>
    </template>
    <div class="p-4">
      <div v-if="totalCount === 0" class="text-center">No pending transactions</div>
      <template v-else>
        <span
          v-if="uiStore.broadcastingTransactionsCount !== 0"
          class="border rounded-lg px-3 py-2 flex items-center w-full mb-2 last:mb-0"
        >
          {{ uiStore.broadcastingTransactionsCount }}
          {{ uiStore.broadcastingTransactionsCount === 1 ? 'transaction' : 'transactions' }}
          broadcasting
        </span>
        <a
          v-for="txId in uiStore.pendingTransactions"
          :key="txId"
          :href="currentNetwork.helpers.getTransactionLink(txId)"
          target="_blank"
          class="border rounded-lg px-3 py-2 flex items-center w-full mb-2 last:mb-0"
        >
          <IH-external-link />
          <div class="ml-2 truncate text-skin-link">{{ txId }}</div>
        </a>
      </template>
    </div>
  </UiModal>
</template>
