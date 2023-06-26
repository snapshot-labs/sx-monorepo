<script setup lang="ts">
import Draggable from 'vuedraggable';
import { getNetwork } from '@/networks';
import { Transaction as TransactionType, Space, SelectedStrategy } from '@/types';

const props = defineProps<{
  modelValue: TransactionType[];
  space?: Space;
  selectedExecutionStrategy: SelectedStrategy;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: TransactionType[]): void;
}>();

const { treasury } = useTreasury(toRef(props, 'space'));

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

const network = computed(() => (props.space ? getNetwork(props.space.network) : null));
const currentTreasury = computed(() =>
  props.selectedExecutionStrategy.type === 'SimpleQuorumTimelock' && network.value
    ? { wallet: props.selectedExecutionStrategy.address, network: network.value?.baseChainId }
    : treasury.value
);
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
  <div class="space-y-3">
    <div class="overflow-hidden border rounded-lg">
      <ExecutionButton :disabled="!currentTreasury" @click="openModal('sendToken')">
        <IH-cash class="inline-block" />
        <span>Send token</span>
      </ExecutionButton>
      <ExecutionButton :disabled="!currentTreasury" @click="openModal('sendNft')">
        <IH-photograph class="inline-block" />
        <span>Send NFT</span>
      </ExecutionButton>
      <ExecutionButton @click="openModal('contractCall')">
        <IH-code class="inline-block" />
        <span>Contract call</span>
      </ExecutionButton>
    </div>
    <div v-if="txs.length > 0" class="x-block !border-x rounded-lg">
      <Draggable v-model="txs" handle=".handle" :item-key="() => undefined">
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
      </Draggable>
    </div>
    <teleport to="#modal">
      <ModalSendToken
        v-if="currentTreasury"
        :open="modalOpen.sendToken"
        :address="currentTreasury.wallet"
        :network="currentTreasury.network"
        :initial-state="modalState.sendToken"
        @close="modalOpen.sendToken = false"
        @add="addTx"
      />
      <ModalSendNft
        v-if="currentTreasury"
        :open="modalOpen.sendNft"
        :address="currentTreasury.wallet"
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
