<script setup>
import { ref } from 'vue';
import { Interface } from '@ethersproject/abi';

defineProps({ txs: Array });

const modalOpen = ref(false);

function decodeTx(tx) {
  const iface = new Interface(tx.abi);
  const decodedTx = JSON.parse(JSON.stringify(iface.parseTransaction(tx)));
  decodedTx.to = tx.to;
  return decodedTx;
}

function decodeTxs(txs) {
  return txs.map(tx => decodeTx(tx));
}
</script>
<template>
  <div class="x-block">
    <a @click="modalOpen = true" class="w-full">
      <h4 class="px-4 py-3">
        <IH-plus-sm class="inline-block" /> Add transaction
      </h4>
    </a>
    <div v-if="txs.length > 0" class="border-b">
      <div
        v-for="(tx, i) in decodeTxs(txs)"
        :key="i"
        class="border-b last:border-b-0 px-4 py-3 space-x-2"
      >
        <IH-selector class="inline-block" />
        <h4 class="inline-block">
          <IH-document-text class="inline-block mr-1" />
          {{ shorten(tx.to) }}
        </h4>
        <span class="s-label !inline-block">{{ tx.name }}</span>
        <span class="inline-block float-right space-x-2">
          <IH-pencil class="inline-block mr-1" />
          <IH-trash class="inline-block mr-1" />
        </span>
      </div>
    </div>
    <teleport to="#modal">
      <ModalTransaction :open="modalOpen" @close="modalOpen = false" />
    </teleport>
  </div>
</template>
