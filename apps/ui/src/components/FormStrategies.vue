<script setup lang="ts">
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const model = defineModel<StrategyConfig[]>({ required: true });

withDefaults(
  defineProps<{
    networkId: NetworkID;
    spaceId: string;
    votingPowerSymbol: string;
    limit?: number;
    unique?: boolean;
    title: string;
    description: string;
    availableStrategies: StrategyTemplate[];
    defaultParams?: Record<string, any>;
    showTestButton?: boolean;
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
      :space-id="spaceId"
      :voting-power-symbol="votingPowerSymbol"
      :unique="unique"
      :available-strategies="availableStrategies"
      :default-params="defaultParams"
      :show-test-button="showTestButton"
      @update:model-value="value => (model = value)"
    />
  </UiContainerSettings>
</template>
