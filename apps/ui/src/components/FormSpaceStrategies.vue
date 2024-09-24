<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

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

function addStrategy(strategy: StrategyTemplate) {
  editedStrategy.value = {
    id: crypto.randomUUID(),
    params: strategy.defaultParams || {},
    ...strategy
  };
  isEditStrategyModalOpen.value = true;
}

function removeStrategy(strategy: StrategyConfig) {
  strategies.value = strategies.value.filter(s => s.id !== strategy.id);
}
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Strategies</h4>
  <div class="s-box mb-4">
    <UiSelectorNetwork v-model="snapshotChainId" :network-id="networkId" />
  </div>
  <UiContainerSettings
    title="Select up to 8 strategies"
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
        @delete-strategy="removeStrategy"
      />
    </div>
    <UiButton
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
      @add-strategy="strategy => addStrategy(strategy)"
      @close="isStrategiesModalOpen = false"
    />
    <ModalEditStrategy
      with-network-selector
      :open="isEditStrategyModalOpen"
      :network-id="networkId"
      :initial-network="snapshotChainId"
      :definition="editedStrategy?.paramsDefinition"
      :initial-state="editedStrategy?.params"
      @close="isEditStrategyModalOpen = false"
    />
  </teleport>
</template>
