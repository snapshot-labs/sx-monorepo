<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';

const model = defineModel<StrategyConfig | null>({ required: true });

defineProps<{
  title: string;
  description: string;
  availableStrategies: StrategyTemplate[];
  availableVotingStrategies: StrategyTemplate[];
}>();

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const editStrategyModalOpen = ref(false);
const votingStrategies = ref([] as StrategyConfig[]);

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

onMounted(() => {
  votingStrategies.value = model.value?.params?.strategies || [];
});

watch(
  () => votingStrategies.value,
  to => {
    if (!model.value) return;

    model.value = {
      ...model.value,
      params: {
        ...model.value?.params,
        strategies: to
      }
    };
  }
);
</script>

<template>
  <div>
    <div class="mb-4">
      <h3 class="mb-2">{{ title }}</h3>
      <span class="mb-3 inline-block">
        {{ description }}
      </span>
      <div class="mb-3">
        <div v-if="!model">No strategy selected</div>
        <div
          v-else
          class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
        >
          <div class="flex min-w-0">
            <div class="whitespace-nowrap">{{ model.name }}</div>
            <div
              v-if="model.generateSummary"
              class="ml-2 pr-2 text-skin-text truncate"
            >
              {{ model.generateSummary(model.params) }}
            </div>
          </div>
          <div class="flex gap-3">
            <button
              v-if="model.paramsDefinition"
              type="button"
              @click="editStrategy(model)"
            >
              <IH-pencil />
            </button>
            <button type="button" @click="removeStrategy()">
              <IH-trash />
            </button>
          </div>
        </div>
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
        <h3 class="eyebrow mb-2">Included strategies</h3>
        <span class="mb-3 inline-block">
          Select strategies that will be used to compute proposal
        </span>
        <StrategiesConfigurator
          v-model="votingStrategies"
          :available-strategies="availableVotingStrategies"
        />
      </div>
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
