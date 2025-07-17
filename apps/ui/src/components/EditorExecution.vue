<script setup lang="ts">
import Draggable from 'vuedraggable';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { simulate } from '@/helpers/tenderly';
import { getExecutionName } from '@/helpers/ui';
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Contact, Space, Transaction as TransactionType } from '@/types';

const model = defineModel<TransactionType[]>({
  required: true
});

const props = defineProps<{
  space: Space;
  disabled?: boolean;
  strategy: StrategyWithTreasury;
  extraContacts?: Contact[];
}>();

const uiStore = useUiStore();
const { treasury } = useTreasury(props.strategy.treasury);

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

const fileInput = ref<HTMLInputElement | null>(null);

const network = computed(() => getNetwork(props.space.network));

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

function convertSafeToTransaction(safeTransaction: any): TransactionType {
  const { to, value, data, contractMethod, contractInputsValues } =
    safeTransaction;

  // Create a proper ABI entry for the method
  const abiEntry = contractMethod
    ? {
        name: contractMethod.name,
        type: 'function',
        inputs: contractMethod.inputs || [],
        outputs: [],
        stateMutability: contractMethod.payable ? 'payable' : 'nonpayable'
      }
    : null;

  // Generate the full method signature with parameters
  const methodSignature = contractMethod
    ? `${contractMethod.name}(${contractMethod.inputs?.map((input: any) => input.type).join(',') || ''})`
    : '';

  // Convert Safe transaction to ContractCall transaction
  return {
    to,
    value: value || '0x0',
    data: data || '0x',
    salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
    _type: 'contractCall',
    _form: {
      abi: abiEntry ? [abiEntry] : [],
      recipient: to,
      method: methodSignature,
      args: contractInputsValues || {},
      amount: value && value !== '0x0' ? value : ''
    }
  };
}

function handleImportSafeFile() {
  if (!fileInput.value) return;
  fileInput.value.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    try {
      const result = e.target?.result as string;
      const safeFile = JSON.parse(result);

      // Validate it's a Safe file
      if (!safeFile.transactions || !Array.isArray(safeFile.transactions)) {
        throw new Error('Invalid Safe file format');
      }

      if (safeFile.transactions.length === 0) {
        throw new Error('No transactions found in file');
      }

      // Validate chainId matches if provided
      if (safeFile.chainId && props.strategy.treasury.chainId) {
        const fileChainId = String(safeFile.chainId);
        const currentChainId = String(props.strategy.treasury.chainId);

        if (fileChainId !== currentChainId) {
          throw new Error(
            `Chain mismatch: file is for chain ${fileChainId}, expected ${currentChainId}`
          );
        }
      }

      // Convert each Safe transaction to our format
      const convertedTransactions = safeFile.transactions.map(
        convertSafeToTransaction
      );

      // Add converted transactions to the current list
      model.value = [...model.value, ...convertedTransactions];

      // Show success message
      uiStore.addNotification(
        'success',
        `Imported ${convertedTransactions.length} transaction${convertedTransactions.length > 1 ? 's' : ''}`
      );

      // Clear file input
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    } catch (error) {
      console.error('Error importing Safe file:', error);
      // Show user-friendly error message via notification system
      let errorMessage = 'Failed to import Safe file';

      if (error instanceof SyntaxError) {
        errorMessage = 'Invalid JSON file';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      uiStore.addNotification('error', errorMessage);

      // Clear file input on error
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    }
  };

  reader.readAsText(file);
}

function editTx(index: number) {
  const tx = model.value[index];

  editedTx.value = index;
  modalState.value[tx._type] = tx._form;
  modalOpen.value[tx._type] = true;
}

async function handleSimulateClick() {
  if (
    simulationState.value !== null ||
    !treasury.value ||
    typeof treasury.value.network === 'string'
  ) {
    return;
  }

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
      <div
        v-if="treasury && network"
        class="w-full flex justify-between items-center px-4 py-3"
      >
        <UiBadgeNetwork
          :chain-id="treasury.network"
          class="mr-3 shrink-0 size-fit"
          :class="{
            'opacity-40': disabled
          }"
        >
          <UiStamp
            :id="treasury.wallet"
            type="avatar"
            :size="32"
            class="rounded-md"
          />
        </UiBadgeNetwork>
        <div class="flex-1 leading-[22px] overflow-hidden">
          <h4
            class="text-skin-link truncate"
            :class="{
              'text-skin-border': disabled
            }"
            v-text="treasury.name || shorten(treasury.wallet)"
          />
          <div
            class="text-skin-text text-[17px] truncate"
            :class="{
              'text-skin-border': disabled
            }"
            v-text="getExecutionName(props.space.network, strategy.type)"
          />
        </div>
        <div class="space-x-2 shrink-0">
          <UiTooltip title="Send token">
            <UiButton
              :disabled="!treasury || disabled || !treasury.supportsTokens"
              class="!px-0 w-[46px]"
              @click="openModal('sendToken')"
            >
              <IH-cash class="inline-block" />
            </UiButton>
          </UiTooltip>
          <UiTooltip title="Send NFT">
            <UiButton
              :disabled="!treasury || disabled || !treasury.supportsNfts"
              class="!px-0 w-[46px]"
              @click="openModal('sendNft')"
            >
              <IH-photograph class="inline-block" />
            </UiButton>
          </UiTooltip>
          <UiTooltip title="Contract call">
            <UiButton
              :disabled="!treasury || disabled"
              class="!px-0 w-[46px]"
              @click="openModal('contractCall')"
            >
              <IH-code class="inline-block" />
            </UiButton>
          </UiTooltip>
          <UiTooltip title="Import Safe file">
            <UiButton
              :disabled="!treasury || disabled"
              class="!px-0 w-[46px]"
              @click="handleImportSafeFile"
            >
              <IH-upload class="inline-block" />
            </UiButton>
          </UiTooltip>
        </div>
      </div>
      <template v-if="model.length > 0 && treasury">
        <UiLabel label="Transactions" class="border-t" />
        <div>
          <Draggable
            v-model="model"
            handle=".handle"
            :item-key="() => undefined"
          >
            <template #item="{ element: tx, index: i }">
              <TransactionsListItem :tx="tx" :chain-id="treasury.network">
                <template v-if="model.length > 1" #left>
                  <div
                    class="handle text-skin-link cursor-pointer opacity-50 hover:opacity-100"
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
        v-if="treasury && treasury.supportsTokens"
        :open="modalOpen.sendToken"
        :address="treasury.wallet"
        :network="treasury.network"
        :extra-contacts="extraContacts"
        :initial-state="modalState.sendToken"
        @close="modalOpen.sendToken = false"
        @add="addTx"
      />
      <ModalSendNft
        v-if="treasury && treasury.supportsNfts"
        :open="modalOpen.sendNft"
        :address="treasury.wallet"
        :network="treasury.network"
        :extra-contacts="extraContacts"
        :initial-state="modalState.sendNft"
        @close="modalOpen.sendNft = false"
        @add="addTx"
      />
      <ModalStakeToken
        v-if="treasury && treasury.supportsTokens"
        :open="modalOpen.stakeToken"
        :address="treasury.wallet"
        :network="treasury.network"
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

    <!-- Hidden file input for Safe file import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>
