<script setup lang="ts">
import { ref, computed, Ref } from 'vue';
import draggable from 'vuedraggable';
import { formatUnits } from '@ethersproject/units';
import { _n, shorten } from '@/helpers/utils';
import space from '@/helpers/space.json';
import { Transaction } from '@/types';

const props = defineProps<{ modelValue: Transaction[] }>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Transaction[]): void;
}>();

const editedTx: Ref<number | null> = ref(null);
const modalState: Ref<{
  sendToken?: any;
  sendNft?: any;
  contractCall?: any;
}> = ref({});
const modalOpen = ref({
  sendToken: false,
  sendNft: false,
  contractCall: false
});

function getTitle(tx: Transaction) {
  if (tx._type === 'sendToken') {
    return `Send <b>${_n(
      formatUnits(tx._form.amount, tx._form.token.decimals)
    )}</b> ${tx._form.token.symbol} to <b>${shorten(tx._form.recipient)}</b>`;
  }

  if (tx._type === 'sendNft') {
    return `Send <b>${_n(
      formatUnits(tx._form.amount, 0)
    )}</b> NFT to <b>${shorten(tx._form.recipient)}</b>`;
  }

  if (tx._type === 'contractCall') {
    return `Contract call to <b>${shorten(tx.to)}</b>`;
  }
}

const txs = computed({
  get: () => props.modelValue,
  set: newValue => {
    emit('update:modelValue', newValue);
  }
});

function addTx(tx: Transaction) {
  const newValue = [...props.modelValue];

  if (editedTx.value !== null) {
    newValue[editedTx.value] = tx;
  } else {
    newValue.push(tx);
  }

  emit('update:modelValue', newValue);
}

function removeTx(index: number) {
  emit('update:modelValue', [
    ...props.modelValue.slice(0, index),
    ...props.modelValue.slice(index + 1)
  ]);
}

function openModal(type: 'sendToken' | 'sendNft' | 'contractCall') {
  editedTx.value = null;
  modalState.value[type] = null;
  modalOpen.value[type] = true;
}

function editTx(index: number) {
  const tx = props.modelValue[index];

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
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
          @click="openModal('sendToken')"
        >
          <IH-stop />
          Send token
        </a>
        <a
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
          @click="openModal('sendNft')"
        >
          <IH-photograph />
          Send NFT
        </a>
        <a
          class="px-4 py-3 border-b border rounded-lg block min-w-[165px]"
          @click="openModal('contractCall')"
        >
          <IH-chip />
          Contract call
        </a>
      </div>
    </div>
    <div v-if="txs.length > 0" class="x-block !border-x rounded-lg">
      <draggable v-model="txs" handle=".handle" :item-key="() => undefined">
        <template #item="{ element: tx, index: i }">
          <div
            class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between"
          >
            <div class="flex items-center max-w-[70%]">
              <div
                v-if="txs.length > 1"
                class="handle mr-2 text-white cursor-pointer opacity-50 hover:opacity-100"
              >
                <IH-switch-vertical />
              </div>
              <IH-stop v-if="tx._type === 'sendToken'" />
              <IH-photograph v-else-if="tx._type === 'sendNft'" />
              <IH-chip v-else />
              <div class="ml-2 truncate text-skin-link" v-html="getTitle(tx)" />
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
        </template>
      </draggable>
    </div>
    <teleport to="#modal">
      <ModalSendToken
        :open="modalOpen.sendToken"
        :address="space.wallet"
        :initial-state="modalState.sendToken"
        @close="modalOpen.sendToken = false"
        @add="addTx"
      />
      <ModalSendNft
        :open="modalOpen.sendNft"
        :address="space.wallet"
        :initial-state="modalState.sendNft"
        @close="modalOpen.sendNft = false"
        @add="addTx"
      />
      <ModalTransaction
        :open="modalOpen.contractCall"
        :initial-state="modalState.contractCall"
        @close="modalOpen.contractCall = false"
        @add="addTx"
      />
    </teleport>
  </div>
</template>
