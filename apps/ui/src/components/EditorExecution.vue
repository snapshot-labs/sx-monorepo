<script setup lang="ts">
import Draggable from 'vuedraggable';
import { simulate } from '@/helpers/tenderly';
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import {
  Contact,
  Space,
  SpaceMetadataTreasury,
  Transaction as TransactionType
} from '@/types';

const model = defineModel<TransactionType[]>({
  required: true
});

const props = defineProps<{
  space: Space;
  treasuryData: SpaceMetadataTreasury;
  extraContacts?: Contact[];
}>();

const uiStore = useUiStore();
const { treasury } = useTreasury(props.treasuryData);

const editedTx: Ref<number | null> = ref(null);
const modalState: Ref<{
  sendToken?: any;
  sendNft?: any;
  stakeToken?: any;
  contractCall?: any;
}> = ref({});
const modalOpen = ref({
  sendToken: false,
  sendNft: false,
  stakeToken: false,
  contractCall: false
});
const simulationState: Ref<
  'SIMULATING' | 'SIMULATION_SUCCEDED' | 'SIMULATION_FAILED' | null
> = ref(null);

const network = computed(() =>
  props.space ? getNetwork(props.space.network) : null
);

function addTx(tx: TransactionType) {
  const newValue = [...model.value];

  if (editedTx.value !== null) {
    newValue[editedTx.value] = tx;
  } else {
    newValue.push(tx);
  }

  model.value = newValue;
}

function removeTx(index: number) {
  model.value = [
    ...model.value.slice(0, index),
    ...model.value.slice(index + 1)
  ];
}

function openModal(
  type: 'sendToken' | 'sendNft' | 'stakeToken' | 'contractCall'
) {
  editedTx.value = null;
  modalState.value[type] = null;
  modalOpen.value[type] = true;
}

function editTx(index: number) {
  const tx = model.value[index];

  editedTx.value = index;
  modalState.value[tx._type] = tx._form;
  modalOpen.value[tx._type] = true;
}

async function handleSimulateClick() {
  if (simulationState.value !== null || !treasury.value) return;

  simulationState.value = 'SIMULATING';

  const valid = await simulate(
    treasury.value.network,
    treasury.value.wallet,
    model.value
  );

  if (valid) {
    simulationState.value = 'SIMULATION_SUCCEDED';
    uiStore.addNotification('success', 'Execution simulation succeeded');
  } else {
    simulationState.value = 'SIMULATION_FAILED';
    uiStore.addNotification('error', 'Execution simulation failed');
  }
}

watch(
  () => model.value,
  () => {
    simulationState.value = null;
  }
);
</script>
<template>
  <div class="space-y-3">
    <div class="overflow-hidden border rounded-lg">
      <button
        v-if="treasury"
        class="w-full flex justify-between items-center px-4 py-3 text-start border-b"
      >
        <UiBadgeNetwork :id="treasury.networkId" class="mr-3">
          <UiStamp
            :id="treasury.wallet"
            type="avatar"
            :size="32"
            class="rounded-md"
          />
        </UiBadgeNetwork>
        <div class="flex-1 leading-[22px]">
          <h4
            class="text-skin-link"
            v-text="treasury.name || shorten(treasury.wallet)"
          />
          <div
            class="text-skin-text text-[17px]"
            v-text="shorten(treasury.wallet)"
          />
        </div>
      </button>
      <div class="flex gap-2 p-3">
        <UiButton
          class="w-full space-x-2"
          :disabled="!treasury"
          @click="openModal('sendToken')"
        >
          <IH-cash class="inline-block" />
          <span>Send token</span>
        </UiButton>
        <UiButton
          class="w-full space-x-2"
          :disabled="!treasury"
          @click="openModal('sendNft')"
        >
          <IH-photograph class="inline-block" />
          <span>Send NFT</span>
        </UiButton>
        <UiButton class="w-full space-x-2" @click="openModal('contractCall')">
          <IH-code class="inline-block" />
          <span>Contract call</span>
        </UiButton>
      </div>
      <template v-if="model.length > 0">
        <UiLabel label="Transactions" class="border-t" />
        <div>
          <Draggable
            v-model="model"
            handle=".handle"
            :item-key="() => undefined"
          >
            <template #item="{ element: tx, index: i }">
              <TransactionsListItem :tx="tx">
                <template #left>
                  <div
                    v-if="model.length > 1"
                    class="handle mr-2 text-skin-link cursor-pointer opacity-50 hover:opacity-100"
                  >
                    <IH-switch-vertical />
                  </div>
                </template>
                <template #right>
                  <div class="flex gap-3">
                    <button type="button" @click="editTx(i)">
                      <IH-pencil />
                    </button>
                    <button type="button" @click="removeTx(i)">
                      <IH-trash />
                    </button>
                  </div>
                </template>
              </TransactionsListItem>
            </template>
          </Draggable>
          <div
            class="border-t px-4 py-2 space-x-2 flex items-center justify-between"
          >
            <div class="flex items-center max-w-[70%]">
              {{ model.length }}
              {{ model.length === 1 ? 'transaction' : 'transactions' }}
            </div>
            <UiTooltip
              v-if="!network?.supportsSimulation"
              title="Simulation not supported on this network"
            >
              <IH-shield-exclamation />
            </UiTooltip>
            <UiTooltip
              v-else-if="simulationState === null"
              title="Simulate execution"
            >
              <button type="button" class="flex" @click="handleSimulateClick">
                <IH-shield-check class="text-skin-link" />
              </button>
            </UiTooltip>
            <UiLoading v-else-if="simulationState === 'SIMULATING'" />
            <UiTooltip
              v-if="simulationState === 'SIMULATION_SUCCEDED'"
              title="Execution simulation succeeded"
            >
              <IH-shield-check class="text-skin-success" />
            </UiTooltip>
            <UiTooltip
              v-if="simulationState === 'SIMULATION_FAILED'"
              title="Execution simulation failed"
            >
              <IH-shield-check class="text-skin-danger" />
            </UiTooltip>
          </div>
        </div>
      </template>
    </div>

    <teleport to="#modal">
      <ModalSendToken
        v-if="treasury && treasury.networkId"
        :open="modalOpen.sendToken"
        :address="treasury.wallet"
        :network="treasury.network"
        :network-id="treasury.networkId"
        :extra-contacts="extraContacts"
        :initial-state="modalState.sendToken"
        @close="modalOpen.sendToken = false"
        @add="addTx"
      />
      <ModalSendNft
        v-if="treasury"
        :open="modalOpen.sendNft"
        :address="treasury.wallet"
        :network="treasury.network"
        :extra-contacts="extraContacts"
        :initial-state="modalState.sendNft"
        @close="modalOpen.sendNft = false"
        @add="addTx"
      />
      <ModalStakeToken
        v-if="treasury"
        :open="modalOpen.stakeToken"
        :address="treasury.wallet"
        :network="treasury.network"
        :network-id="treasury.networkId"
        :initial-state="modalState.stakeToken"
        @close="modalOpen.stakeToken = false"
        @add="addTx"
      />
      <ModalTransaction
        v-if="treasury"
        :open="modalOpen.contractCall"
        :network="treasury.network"
        :extra-contacts="extraContacts"
        :initial-state="modalState.contractCall"
        @close="modalOpen.contractCall = false"
        @add="addTx"
      />
    </teleport>
  </div>
</template>
