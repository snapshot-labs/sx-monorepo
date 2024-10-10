<script setup lang="ts">
import objectHash from 'object-hash';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { ChainId, NetworkID } from '@/types';

const strategies = defineModel<StrategyConfig[]>({
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
  allowDuplicates?: boolean;
  defaultChainId?: ChainId;
  limit?: number;
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

function handleSaveStrategy(params: Record<string, any>, network: ChainId) {
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

function validateStrategy(params: Record<string, any>, network: ChainId) {
  const editedStrategyValue = editedStrategy.value;
  if (editedStrategyValue === null) return;

  const otherStrategies = strategies.value.filter(
    s => s.id !== editedStrategyValue.id
  );

  if (!props.allowDuplicates) {
    const hasDuplicates = otherStrategies.some(
      s =>
        s.address === editedStrategyValue.address &&
        s.chainId === network &&
        objectHash(s.params) === objectHash(params)
    );

    if (hasDuplicates) return 'Two identical strategies are not allowed.';
  }
}

function handleRemoveStrategy(strategy: StrategyConfig) {
  strategies.value = strategies.value.filter(s => s.id !== strategy.id);
}
</script>

<template>
  <div>
    <div class="space-y-3 mb-3">
      <slot v-if="strategies.length === 0" name="empty">
        <div>No strategies selected</div>
      </slot>
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
      v-if="!props.limit || strategies.length < props.limit"
      class="w-full flex items-center justify-center gap-1"
      @click="isStrategiesModalOpen = true"
    >
      <IH-plus class="shrink-0 size-[16px]" />
      Add strategy
    </UiButton>
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
        :initial-network="editedStrategy.chainId ?? defaultChainId"
        :strategy-address="editedStrategy.address"
        :definition="editedStrategy.paramsDefinition"
        :initial-state="editedStrategy.params"
        :custom-error-validation="validateStrategy"
        @save="handleSaveStrategy"
        @close="isEditStrategyModalOpen = false"
      />
    </teleport>
  </div>
</template>
