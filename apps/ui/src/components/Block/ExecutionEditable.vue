<script setup>
import { ref } from 'vue';
import { shorten } from '@/helpers/utils';

const txs = ref([]);
const modalOpen = ref({
  sendToken: false,
  sendNft: false,
  contractCall: false
});

function addTx(tx) {
  txs.value.push(tx);
}

function removeTx(index) {
  txs.value = txs.value.filter((tx, i) => i !== index);
}
</script>
<template>
  <div>
    <div class="overflow-hidden w-auto">
      <div
        class="mb-3 flex flex-no-wrap overflow-x-scroll no-scrollbar scrolling-touch items-start space-x-3"
      >
        <a
          @click="modalOpen.sendToken = true"
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
        >
          <IH-stop />
          Send token
        </a>
        <a
          @click="modalOpen.sendNft = true"
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
        >
          <IH-photograph />
          Send NFT
        </a>
        <a
          @click="modalOpen.contractCall = true"
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
        >
          <IH-chip />
          Contract call
        </a>
      </div>
    </div>
    <div v-if="txs.length > 0" class="x-block">
      <div
        v-for="(tx, i) in txs"
        :key="i"
        class="border-b last:border-b-0 px-4 py-3 space-x-2"
      >
        <h4 class="inline-block">
          <IH-chip class="inline-block mr-1" />
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
    <teleport to="#modal">
      <ModalSendToken
        :open="modalOpen.sendToken"
        @close="modalOpen.sendToken = false"
      />
      <ModalSendNft
        :open="modalOpen.sendNft"
        @close="modalOpen.sendNft = false"
      />
      <ModalTransaction
        :open="modalOpen.contractCall"
        @close="modalOpen.contractCall = false"
        @add="addTx"
      />
    </teleport>
  </div>
</template>
