<script setup lang="ts">
import { ref, computed, Ref } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { _n, shorten } from '@/helpers/utils';
import spaces from '@/helpers/spaces.json';
import { Transaction } from '@/types';

const address = spaces.pasta.wallets[0];

const txs: Ref<Transaction[]> = ref([]);
const editedTx: Ref<number | null> = ref(null);
const modalState: Ref<object> = ref({});
const modalOpen = ref({
  sendToken: false,
  sendNft: false,
  contractCall: false
});

const formattedTxs = computed(() =>
  txs.value.map(tx => {
    let title = '';
    if (tx._type === 'sendToken') {
      title = `Send ${_n(
        formatUnits(tx._form.amount, tx._form.token.decimals)
      )} ${tx._form.token.symbol} to ${shorten(tx._form.recipient)}`;
    } else if (tx._type === 'sendNft') {
      title = `Send ${_n(formatUnits(tx._form.amount, 0))} NFT to ${shorten(
        tx._form.recipient
      )}`;
    } else if (tx._type === 'contractCall') {
      title = `Contract call to ${shorten(tx.to)}`;
    }

    return { ...tx, title };
  })
);

function addTx(tx: Transaction) {
  if (editedTx.value !== null) {
    txs.value[editedTx.value] = tx;
  } else {
    txs.value.push(tx);
  }
}

function removeTx(index) {
  txs.value = txs.value.filter((tx, i) => i !== index);
}

function openModal(type: 'sendToken' | 'sendNft' | 'contractCall') {
  editedTx.value = null;
  modalState.value[type] = null;
  modalOpen.value[type] = true;
}

function editTx(index) {
  const tx = txs.value[index];

  editedTx.value = index;
  modalState.value[tx._type] = tx._form;
  modalOpen.value[tx._type] = true;
}
</script>
<template>
  <div>
    <div class="overflow-hidden w-auto">
      <div
        class="mb-3 flex flex-no-wrap overflow-x-scroll no-scrollbar scrolling-touch items-start space-x-3"
      >
        <a
          @click="openModal('sendToken')"
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
        >
          <IH-stop />
          Send token
        </a>
        <a
          @click="openModal('sendNft')"
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
        >
          <IH-photograph />
          Send NFT
        </a>
        <a
          @click="openModal('contractCall')"
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
        >
          <IH-chip />
          Contract call
        </a>
      </div>
    </div>
    <div v-if="txs.length > 0" class="x-block">
      <div
        v-for="(tx, i) in formattedTxs"
        :key="i"
        class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between"
      >
        <div class="flex items-center">
          <IH-stop v-if="tx._type === 'sendToken'" />
          <IH-photograph v-else-if="tx._type === 'sendNft'" />
          <IH-chip v-else />
          <h4 class="ml-2 inline-block">
            {{ tx.title }}
          </h4>
        </div>
        <div class="flex gap-3">
          <a @click="editTx(i)">
            <IH-pencil />
          </a>
          <a @click="removeTx(i)">
            <IH-trash />
          </a>
        </div>
      </div>
    </div>
    <teleport to="#modal">
      <ModalSendToken
        :open="modalOpen.sendToken"
        :address="address"
        :initialState="modalState.sendToken"
        @close="modalOpen.sendToken = false"
        @add="addTx"
      />
      <ModalSendNft
        :open="modalOpen.sendNft"
        :address="address"
        :initialState="modalState.sendNft"
        @close="modalOpen.sendNft = false"
        @add="addTx"
      />
      <ModalTransaction
        :open="modalOpen.contractCall"
        :initialState="modalState.contractCall"
        @close="modalOpen.contractCall = false"
        @add="addTx"
      />
    </teleport>
  </div>
</template>
