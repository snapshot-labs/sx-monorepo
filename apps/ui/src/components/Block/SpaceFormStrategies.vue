<script setup lang="ts">
import type { StrategyConfig, StrategyTemplate } from '@/networks/types';

withDefaults(
  defineProps<{
    modelValue: StrategyConfig[];
    limit?: number;
    unique?: boolean;
    title: string;
    description: string;
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
</script>

<template>
  <div class="mb-4">
    <h3 class="mb-2">{{ title }}</h3>
    <span class="mb-3 inline-block">
      {{ description }}
    </span>
    <BlockStrategiesConfigurator
      :model-value="modelValue"
      :unique="unique"
      :available-strategies="availableStrategies"
      @update:model-value="value => emit('update:modelValue', value)"
    />
  </div>
</template>
