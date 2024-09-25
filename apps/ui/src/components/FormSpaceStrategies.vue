<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const LIMIT = 8;

const snapshotChainId = defineModel<string>('snapshotChainId', {
  required: true
});
const strategies = defineModel<StrategyConfig[]>('strategies', {
  required: true
});

defineProps<{
  networkId: NetworkID;
}>();

const isStrategiesModalOpen = ref(false);
const isEditStrategyModalOpen = ref(false);
const editedStrategy: Ref<StrategyConfig | null> = ref(null);

function handleAddStrategy(strategy: StrategyTemplate) {
  editedStrategy.value = {
    id: crypto.randomUUID(),
    params: strategy.defaultParams || {},
    ...strategy
  };

  isEditStrategyModalOpen.value = true;
}

async function handleEditStrategy(strategy: StrategyConfig) {
  editedStrategy.value = strategy;
  isEditStrategyModalOpen.value = true;
}

function handleSaveStrategy(params: Record<string, any>, network: string) {
  const editedStrategyValue = editedStrategy.value;

  if (editedStrategyValue === null) return;

  isEditStrategyModalOpen.value = false;

  let allStrategies = [...strategies.value];
  if (!allStrategies.find(s => s.id === editedStrategyValue.id)) {
    allStrategies.push(editedStrategyValue);
  }

  strategies.value = allStrategies.map(strategy => {
    if (strategy.id !== editedStrategyValue.id) return strategy;

    return {
      ...strategy,
      chainId: network,
      params
    };
  });
}

function handleRemoveStrategy(strategy: StrategyConfig) {
  strategies.value = strategies.value.filter(s => s.id !== strategy.id);
}
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Strategies</h4>
  <div class="s-box mb-4">
    <UiSelectorNetwork
      v-model="snapshotChainId"
      :network-id="networkId"
      tooltip="The default network used for this space. Networks can also be specified in individual strategies"
    />
  </div>
  <UiContainerSettings
    :title="`Select up to ${LIMIT} strategies`"
    description="(Voting power is cumulative)"
  >
    <div class="space-y-3 mb-3">
      <div v-if="strategies.length === 0">No strategies selected</div>
      <FormStrategiesStrategyActive
        v-for="strategy in strategies"
        :key="strategy.id"
        class="mb-3"
        :network-id="networkId"
        :strategy="strategy"
        @edit-strategy="handleEditStrategy"
        @delete-strategy="handleRemoveStrategy"
      />
    </div>
    <UiButton
      v-if="strategies.length < LIMIT"
      class="w-full flex items-center justify-center gap-1"
      @click="isStrategiesModalOpen = true"
    >
      <IH-plus class="shrink-0 size-[16px]" />
      Add strategy
    </UiButton>
  </UiContainerSettings>
  <teleport to="#modal">
    <ModalStrategies
      :open="isStrategiesModalOpen"
      :network-id="networkId"
      @add-strategy="handleAddStrategy"
      @close="isStrategiesModalOpen = false"
    />
    <ModalEditStrategy
      v-if="editedStrategy"
      with-network-selector
      :open="isEditStrategyModalOpen"
      :network-id="networkId"
      :initial-network="editedStrategy.chainId ?? snapshotChainId"
      :strategy-address="editedStrategy.address"
      :definition="editedStrategy.paramsDefinition"
      :initial-state="editedStrategy.params"
      @save="handleSaveStrategy"
      @close="isEditStrategyModalOpen = false"
    />
  </teleport>
</template>
