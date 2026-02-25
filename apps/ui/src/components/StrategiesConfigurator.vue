<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const model = defineModel<StrategyConfig[]>({ required: true });

const props = withDefaults(
  defineProps<{
    networkId: NetworkID;
    spaceId: string;
    votingPowerSymbol: string;
    limit?: number;
    unique?: boolean;
    availableStrategies: StrategyTemplate[];
    defaultParams?: Record<string, any>;
    showTestButton?: boolean;
  }>(),
  {
    limit: Infinity,
    unique: false,
    defaultParams: () => ({})
  }
);

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const testedStrategies: Ref<StrategyConfig[]> = ref([]);
const editStrategyModalOpen = ref(false);
const isTestStrategiesModalOpen = ref(false);

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

async function handleTestStrategies(strategies: StrategyConfig[]) {
  testedStrategies.value = strategies;
  isTestStrategiesModalOpen.value = true;
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <UiEyebrow class="font-medium">Active</UiEyebrow>
      <UiTooltip
        v-if="model.length && showTestButton"
        title="Test all custom strategies"
        class="flex items-center"
      >
        <button class="text-skin-link" @click="handleTestStrategies(model)">
          <IH-play />
        </button>
      </UiTooltip>
    </div>
    <div class="space-y-3 mb-4">
      <div v-if="model.length === 0">No strategies selected</div>
      <FormStrategiesStrategyActive
        v-for="strategy in model"
        :key="strategy.id"
        :network-id="networkId"
        :strategy="strategy"
        :show-test-button="showTestButton"
        @edit-strategy="editStrategy"
        @delete-strategy="removeStrategy"
        @test-strategies="handleTestStrategies"
      />
    </div>
    <UiEyebrow class="mb-2 font-medium">Available</UiEyebrow>
    <div v-if="availableStrategies.length === 0">No strategies available</div>
    <div v-else class="space-y-3">
      <ButtonStrategy
        v-for="strategy in availableStrategies.filter(s => !s.deprecated)"
        :key="strategy.address"
        :disabled="
          limitReached || (unique && !!activeStrategiesMap[strategy.name])
        "
        :strategy="strategy"
        @click="addStrategy(strategy)"
      />
    </div>
    <teleport to="#modal">
      <ModalTestStrategy
        :open="isTestStrategiesModalOpen"
        :network-id="networkId"
        :space-id="spaceId"
        :voting-power-symbol="votingPowerSymbol"
        :strategies="testedStrategies"
        @close="isTestStrategiesModalOpen = false"
      />
      <ModalEditStrategy
        v-if="editedStrategy"
        :open="editStrategyModalOpen"
        :network-id="networkId"
        :strategy-address="editedStrategy.address"
        :definition="editedStrategy.paramsDefinition"
        :initial-state="editedStrategy.params"
        @close="editStrategyModalOpen = false"
        @save="handleStrategySave"
      />
    </teleport>
  </div>
</template>
