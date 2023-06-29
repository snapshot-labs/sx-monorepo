<script setup lang="ts">
import Draggable from 'vuedraggable';
import { getNetwork } from '@/networks';
import { useUiStore } from '@/stores/ui';
import { simulate } from '@/helpers/tenderly';
import { Transaction as TransactionType, Space, SelectedStrategy } from '@/types';

const props = defineProps<{
  modelValue: TransactionType[];
  space?: Space;
  selectedExecutionStrategy: SelectedStrategy;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: TransactionType[]): void;
}>();

const uiStore = useUiStore();
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
const simulationState: Ref<'SIMULATING' | 'SIMULATION_SUCCEDED' | 'SIMULATION_FAILED' | null> =
  ref(null);

const network = computed(() => (props.space ? getNetwork(props.space.network) : null));
const currentTreasury = computed(() =>
  props.selectedExecutionStrategy.type === 'SimpleQuorumTimelock' && network.value
    ? { wallet: props.selectedExecutionStrategy.address, network: network.value.baseChainId }
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

async function handleSimulateClick() {
  if (simulationState.value !== null || !currentTreasury.value) return;

  simulationState.value = 'SIMULATING';

  const valid = await simulate(
    currentTreasury.value.network,
    currentTreasury.value.wallet,
    txs.value
  );

  if (valid) {
    simulationState.value = 'SIMULATION_SUCCEDED';
    uiStore.addNotification('success', 'Execution simulation succeeded');
  } else {
    simulationState.value = 'SIMULATION_FAILED';
    uiStore.addNotification('error', 'Execution simulation failed');
  }
}

watch(txs, () => {
  simulationState.value = null;
});
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
      <div class="border-t px-4 py-2 space-x-2 flex items-center justify-between">
        <div class="flex items-center max-w-[70%]">
          {{ txs.length }} {{ txs.length === 1 ? 'transaction' : 'transactions' }}
        </div>
        <UiTooltip
          v-if="!network?.supportsSimulation"
          title="Simulation not supported on this network"
        >
          <IH-shield-exclamation />
        </UiTooltip>
        <UiTooltip v-else-if="simulationState === null" title="Simulate execution">
          <button class="flex" @click="handleSimulateClick">
            <IH-shield-check class="text-skin-link" />
          </button>
        </UiTooltip>
        <UiLoading v-else-if="simulationState === 'SIMULATING'" />
        <UiTooltip
          v-if="simulationState === 'SIMULATION_SUCCEDED'"
          title="Execution simulation succeeded"
        >
          <IH-shield-check class="text-green" />
        </UiTooltip>
        <UiTooltip
          v-if="simulationState === 'SIMULATION_FAILED'"
          title="Execution simulation failed"
        >
          <IH-shield-check class="text-red" />
        </UiTooltip>
      </div>
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
