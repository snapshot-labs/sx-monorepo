<script setup lang="ts">
import type { StrategyConfig, StrategyTemplate } from '@/networks/types';

const props = defineProps<{
  modelValue: StrategyConfig | null;
  title: string;
  description: string;
  availableStrategies: StrategyTemplate[];
  availableVotingStrategies: StrategyTemplate[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: StrategyConfig | null);
}>();

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const editStrategyModalOpen = ref(false);
const votingStrategies = ref([] as StrategyConfig[]);

const activeStrategy = computed({
  get: () => props.modelValue,
  set: newValue => emit('update:modelValue', newValue)
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
    activeStrategy.value = strategyConfig;
  }
}

function editStrategy(strategy: StrategyConfig) {
  editedStrategy.value = strategy;
  editStrategyModalOpen.value = true;
}

function removeStrategy() {
  activeStrategy.value = null;
}

function handleStrategySave(value: Record<string, any>) {
  editStrategyModalOpen.value = false;

  if (!editedStrategy.value) return;

  activeStrategy.value = {
    ...editedStrategy.value,
    params: value
  };
}

onMounted(() => {
  votingStrategies.value = activeStrategy.value?.params?.strategies || [];
});

watch(
  () => votingStrategies.value,
  to => {
    if (!activeStrategy.value) return;

    activeStrategy.value = {
      ...activeStrategy.value,
      params: {
        ...activeStrategy.value?.params,
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
        <div v-if="!activeStrategy">No strategy selected</div>
        <div
          v-else
          class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
        >
          <div class="flex min-w-0">
            <div class="whitespace-nowrap">{{ activeStrategy.name }}</div>
            <div v-if="activeStrategy.generateSummary" class="ml-2 pr-2 text-skin-text truncate">
              {{ activeStrategy.generateSummary(activeStrategy.params) }}
            </div>
          </div>
          <div class="flex gap-3">
            <a v-if="activeStrategy.paramsDefinition" @click="editStrategy(activeStrategy)">
              <IH-pencil />
            </a>
            <a @click="removeStrategy()">
              <IH-trash />
            </a>
          </div>
        </div>
      </div>
      <div v-if="!activeStrategy" class="flex flex-wrap gap-2">
        <StrategyButton
          v-for="strategy in availableStrategies"
          :key="strategy.address"
          :strategy="strategy"
          @click="addStrategy(strategy)"
        />
      </div>
      <div v-if="activeStrategy?.type === 'VotingPower'">
        <h3 class="eyebrow mb-2">Included strategies</h3>
        <span class="mb-3 inline-block">
          Select strategies that will be used to compute proposal
        </span>
        <BlockStrategiesConfigurator
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
