<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const uiStore = useUiStore();
const pendingTransactionsModalOpen = ref(false);
</script>

<template>
  <UiTooltip
    v-if="uiStore.pendingTransactions.length > 0"
    v-bind="$attrs"
    title="Pending transactions"
  >
    <UiButton variant="primary" circle @click="pendingTransactionsModalOpen = true">
      {{ uiStore.pendingTransactions.length }}
    </UiButton>
  </UiTooltip>
  <teleport to="#modal">
    <ModalPendingTransactions
      :open="pendingTransactionsModalOpen"
      @close="pendingTransactionsModalOpen = false"
    />
  </teleport>
</template>
