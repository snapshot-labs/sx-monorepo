<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const model = defineModel<StrategyConfig[]>({ required: true });

withDefaults(
  defineProps<{
    networkId: NetworkID;
    limit?: number;
    unique?: boolean;
    title: string;
    description: string;
    availableStrategies: StrategyTemplate[];
    defaultParams?: Record<string, any>;
  }>(),
  {
    limit: Infinity,
    unique: false
  }
);
</script>

<template>
  <UiContainerSettings :title="title" :description="description">
    <StrategiesConfigurator
      :model-value="model"
      :network-id="networkId"
      :unique="unique"
      :available-strategies="availableStrategies"
      :default-params="defaultParams"
      @update:model-value="value => (model = value)"
    />
  </UiContainerSettings>
</template>
