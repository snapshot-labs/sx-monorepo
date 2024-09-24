<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const model = defineModel<StrategyConfig[]>({ required: true });

const props = withDefaults(
  defineProps<{
    networkId: NetworkID;
    limit?: number;
    unique?: boolean;
    availableStrategies: StrategyTemplate[];
    defaultParams?: Record<string, any>;
  }>(),
  {
    limit: Infinity,
    unique: false,
    defaultParams: () => ({})
  }
);

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const editStrategyModalOpen = ref(false);

const limitReached = computed(() => model.value.length >= props.limit);
const activeStrategiesMap = computed(() =>
  Object.fromEntries(model.value.map(strategy => [strategy.name, strategy]))
);

function addStrategy(strategy: StrategyTemplate) {
  if (limitReached.value) return;

  const strategyConfig = {
    id: crypto.randomUUID(),
    params: {
      ...props.defaultParams
    },
    ...strategy
  };

  if (strategy.paramsDefinition) {
    editStrategy(strategyConfig);
  } else {
    model.value = [...model.value, strategyConfig];
  }
}

function editStrategy(strategy: StrategyConfig) {
  editedStrategy.value = strategy;
  editStrategyModalOpen.value = true;
}

function removeStrategy(strategy: StrategyConfig) {
  model.value = model.value.filter(s => s.id !== strategy.id);
}

function handleStrategySave(value: Record<string, any>) {
  editStrategyModalOpen.value = false;

  let allStrategies = [...model.value];
  if (
    editedStrategy.value &&
    !allStrategies.find(s => s.id === editedStrategy.value?.id)
  ) {
    allStrategies.push(editedStrategy.value);
  }

  model.value = allStrategies.map(strategy => {
    if (strategy.id !== editedStrategy.value?.id) return strategy;

    return {
      ...strategy,
      params: value
    };
  });
}
</script>

<template>
  <div>
    <h4 class="eyebrow mb-2 font-medium">Active</h4>
    <div class="space-y-3 mb-4">
      <div v-if="model.length === 0">No strategies selected</div>
      <FormStrategiesStrategyActive
        v-for="strategy in model"
        :key="strategy.id"
        :network-id="networkId"
        :strategy="strategy"
        @edit-strategy="editStrategy"
        @delete-strategy="removeStrategy"
      />
    </div>
    <h4 class="eyebrow mb-2 font-medium">Available</h4>
    <div v-if="availableStrategies.length === 0">No strategies available</div>
    <div v-else class="space-y-3">
      <ButtonStrategy
        v-for="strategy in availableStrategies"
        :key="strategy.address"
        :disabled="
          limitReached || (unique && !!activeStrategiesMap[strategy.name])
        "
        :strategy="strategy"
        @click="addStrategy(strategy)"
      />
    </div>
    <teleport to="#modal">
      <ModalEditStrategy
        :open="editStrategyModalOpen"
        :network-id="networkId"
        :definition="editedStrategy?.paramsDefinition"
        :initial-state="editedStrategy?.params"
        @close="editStrategyModalOpen = false"
        @save="handleStrategySave"
      />
    </teleport>
  </div>
</template>
