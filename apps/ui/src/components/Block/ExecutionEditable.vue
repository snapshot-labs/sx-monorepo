<script setup lang="ts">
import { ref, computed, Ref } from 'vue';
import draggable from 'vuedraggable';
import { useTreasury } from '@/composables/useTreasury';
import { Transaction as TransactionType, Space } from '@/types';

const props = defineProps<{
  modelValue: TransactionType[];
  space?: Space;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: TransactionType[]): void;
}>();

const { treasury } = useTreasury(props.space);

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

const txs = computed({
  get: () => props.modelValue,
  set: newValue => {
    emit('update:modelValue', newValue);
  }
});

function addTx(tx: TransactionType) {
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
        <ExecutionButton :disabled="!treasury" @click="openModal('sendToken')">
          <IH-stop />
          Send token
        </ExecutionButton>
        <ExecutionButton :disabled="!treasury" @click="openModal('sendNft')">
          <IH-photograph />
          Send NFT
        </ExecutionButton>
        <ExecutionButton @click="openModal('contractCall')">
          <IH-chip />
          Contract call
        </ExecutionButton>
      </div>
    </div>
    <div v-if="txs.length > 0" class="x-block !border-x rounded-lg">
      <draggable v-model="txs" handle=".handle" :item-key="() => undefined">
        <template #item="{ element: tx, index: i }">
          <Transaction :tx="tx">
            <template #left>
              <div
                v-if="txs.length > 1"
                class="handle mr-2 text-skin-link cursor-pointer opacity-50 hover:opacity-100"
              >
                <IH-switch-vertical />
              </div>
            </template>
            <template #right>
              <div class="flex gap-3">
                <a @click="editTx(i)">
                  <IH-pencil />
                </a>
                <a @click="removeTx(i)">
                  <IH-trash />
                </a>
              </div>
            </template>
          </Transaction>
        </template>
      </draggable>
    </div>
    <teleport to="#modal">
      <ModalSendToken
        v-if="treasury"
        :open="modalOpen.sendToken"
        :address="treasury.wallet"
        :network="treasury.network"
        :initial-state="modalState.sendToken"
        @close="modalOpen.sendToken = false"
        @add="addTx"
      />
      <ModalSendNft
        v-if="treasury"
        :open="modalOpen.sendNft"
        :address="treasury.wallet"
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
