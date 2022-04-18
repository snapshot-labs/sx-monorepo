<script setup>
import { ref } from 'vue';
import { shorten } from '@/helpers/utils';

const txs = ref([]);
const modalOpen = ref(false);

function addTx(tx) {
  txs.value.push(tx);
}

function removeTx(index) {
  txs.value = txs.value.filter((tx, i) => i !== index);
}
</script>
<template>
  <div class="x-block">
    <div v-if="txs.length > 0">
      <div v-for="(tx, i) in txs" :key="i" class="border-b px-4 py-3 space-x-2">
        <h4 class="inline-block">
          <IH-document-text class="inline-block mr-1" />
          {{ shorten(tx.to) }}
        </h4>
        <span class="s-label !inline-block">{{ tx.name }}</span>
        <span class="float-right">
          <a @click="removeTx(i)">
            <IH-trash class="inline-block" />
          </a>
        </span>
      </div>
    </div>
    <a @click="modalOpen = true" class="w-full">
      <h4 class="px-4 py-3">
        <IH-plus-sm class="inline-block" /> Add transaction
      </h4>
    </a>
    <teleport to="#modal">
      <ModalTransaction
        :open="modalOpen"
        @close="modalOpen = false"
        @add="addTx"
      />
    </teleport>
  </div>
</template>
