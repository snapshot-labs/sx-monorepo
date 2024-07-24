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
    <UiButtonRound primary @click="pendingTransactionsModalOpen = true">
      {{ uiStore.pendingTransactions.length }}
    </UiButtonRound>
  </UiTooltip>
  <teleport to="#modal">
    <ModalPendingTransactions
      :open="pendingTransactionsModalOpen"
      @close="pendingTransactionsModalOpen = false"
    />
  </teleport>
</template>
