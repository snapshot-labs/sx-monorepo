<script setup lang="ts">
import { Transaction as TransactionType } from '@/types';

defineProps<{ txs: TransactionType[] }>();
</script>

<template>
  <div v-if="txs.length > 0" class="x-block !border-x rounded-lg">
    <Transaction
      v-for="(tx, i) in txs"
      :key="i"
      :tx="tx"
      class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between"
    />
  </div>
</template>
