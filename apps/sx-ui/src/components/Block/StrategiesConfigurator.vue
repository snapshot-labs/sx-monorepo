<script setup lang="ts">
import type { StrategyConfig, StrategyTemplate } from '@/networks/types';

const props = withDefaults(
  defineProps<{
    modelValue: StrategyConfig[];
    limit?: number;
    unique?: boolean;
    availableStrategies: StrategyTemplate[];
  }>(),
  {
    limit: Infinity,
    unique: false
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: StrategyConfig[]);
}>();

const activeStrategies = computed({
  get: () => props.modelValue,
  set: newValue => emit('update:modelValue', newValue)
});

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const editStrategyModalOpen = ref(false);

const limitReached = computed(() => activeStrategies.value.length >= props.limit);
const activeStrategiesMap = computed(() =>
  Object.fromEntries(activeStrategies.value.map(strategy => [strategy.name, strategy]))
);

function addStrategy(strategy: StrategyTemplate) {
  if (limitReached.value) return;

  const strategyConfig = {
    id: crypto.randomUUID(),
    params: {},
    ...strategy
  };

  if (strategy.paramsDefinition) {
    editStrategy(strategyConfig);
  } else {
    activeStrategies.value = [...activeStrategies.value, strategyConfig];
  }
}

function editStrategy(strategy: StrategyConfig) {
  editedStrategy.value = strategy;
  editStrategyModalOpen.value = true;
}

function removeStrategy(strategy: StrategyConfig) {
  activeStrategies.value = activeStrategies.value.filter(s => s.id !== strategy.id);
}

function handleStrategySave(value: Record<string, any>) {
  editStrategyModalOpen.value = false;

  let allStrategies = [...activeStrategies.value];
  if (editedStrategy.value && !allStrategies.find(s => s.id === editedStrategy.value?.id)) {
    allStrategies.push(editedStrategy.value);
  }

  activeStrategies.value = allStrategies.map(strategy => {
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
    <h4 class="eyebrow mb-2">Active</h4>
    <div class="mb-3">
      <div v-if="activeStrategies.length === 0">No strategies selected</div>
      <div
        v-for="strategy in activeStrategies"
        v-else
        :key="strategy.id"
        class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
      >
        <div class="flex min-w-0">
          <div class="whitespace-nowrap">{{ strategy.name }}</div>
          <div v-if="strategy.generateSummary" class="ml-2 pr-2 text-skin-text truncate">
            {{ strategy.generateSummary(strategy.params) }}
          </div>
        </div>
        <div class="flex gap-3">
          <a v-if="strategy.paramsDefinition" @click="editStrategy(strategy)">
            <IH-pencil />
          </a>
          <a @click="removeStrategy(strategy)">
            <IH-trash />
          </a>
        </div>
      </div>
    </div>
    <h4 class="eyebrow mb-2">Available</h4>
    <div v-if="availableStrategies.length === 0">No strategies available</div>
    <div v-else class="space-y-3">
      <StrategyButton
        v-for="strategy in availableStrategies"
        :key="strategy.address"
        :disabled="limitReached || (unique && !!activeStrategiesMap[strategy.name])"
        :strategy="strategy"
        @click="addStrategy(strategy)"
      />
    </div>
    <teleport to="#modal">
      <ModalEditStrategy
        :open="editStrategyModalOpen"
        :definition="editedStrategy?.paramsDefinition"
        :initial-state="editedStrategy?.params"
        @close="editStrategyModalOpen = false"
        @save="handleStrategySave"
      />
    </teleport>
  </div>
</template>
