<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const model = defineModel<StrategyConfig | null>({ required: true });

defineProps<{
  networkId: NetworkID;
  title: string;
  description: string;
  availableStrategies: StrategyTemplate[];
  availableVotingStrategies: StrategyTemplate[];
}>();

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const editStrategyModalOpen = ref(false);

const votingStrategies = computed({
  get: () => model.value?.params?.strategies || [],
  set: (value: StrategyConfig[]) => {
    if (!model.value) return;

    model.value = {
      ...model.value,
      params: {
        ...model.value?.params,
        strategies: value
      }
    };
  }
});

function addStrategy(strategy: StrategyTemplate) {
  const strategyConfig = {
    id: crypto.randomUUID(),
    params: {},
    ...strategy
  };

  if (strategy.paramsDefinition) {
    editStrategy(strategyConfig);
  } else {
    model.value = strategyConfig;
  }
}

function editStrategy(strategy: StrategyConfig) {
  editedStrategy.value = strategy;
  editStrategyModalOpen.value = true;
}

function removeStrategy() {
  model.value = null;
}

function handleStrategySave(value: Record<string, any>) {
  editStrategyModalOpen.value = false;

  if (!editedStrategy.value) return;

  model.value = {
    ...editedStrategy.value,
    params: value
  };
}
</script>

<template>
  <UiContainerSettings :title="title" :description="description">
    <div class="mb-3">
      <div v-if="!model">No strategy selected</div>
      <FormStrategiesStrategyActive
        v-else
        :network-id="networkId"
        :strategy="model"
        @edit-strategy="editStrategy"
        @delete-strategy="removeStrategy"
      />
    </div>
    <div v-if="!model" class="flex flex-wrap gap-2">
      <ButtonStrategy
        v-for="strategy in availableStrategies"
        :key="strategy.address"
        :strategy="strategy"
        @click="addStrategy(strategy)"
      />
    </div>
    <div v-else-if="model.type === 'VotingPower'">
      <h3 class="eyebrow mb-2 font-medium">Included strategies</h3>
      <span class="mb-3 inline-block">
        Select strategies that will be used to compute proposal
      </span>
      <StrategiesConfigurator
        v-model="votingStrategies"
        :network-id="networkId"
        :available-strategies="availableVotingStrategies"
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
  </UiContainerSettings>
</template>
